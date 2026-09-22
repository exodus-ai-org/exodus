import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { agentLoop } from '@earendil-works/pi-agent-core'
import type { Message } from '@earendil-works/pi-ai'
import { ErrorCode } from '@exodus/shared/constants/error-codes'
import { NotFoundError } from '@exodus/shared/errors/app-error'
import { AdvancedTools } from '@exodus/shared/types/ai'
import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatSseEvent,
  ChatToolResultMessage,
  ToolNotice
} from '@exodus/shared/types/chat'
import { Hono } from 'hono'
import { v4 as uuidV4 } from 'uuid'

import { LcmManager, freshTailRuns } from '../../ai/context-management'
import { dropBrokenRuns } from '../../ai/kernel/invariant'
import { streamFn } from '../../ai/kernel/models'
import { getMcpTools } from '../../ai/mcp'
import {
  formatMemoriesForSystem,
  loadRelevantMemories
} from '../../ai/memory/manager'
import {
  buildPersonalityPrompt,
  deepResearchBootPrompt,
  getSystemPrompt
} from '../../ai/prompts'
import { getActiveSkillsContent } from '../../ai/skills/skills-manager'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider,
  getTextFromMessage
} from '../../ai/utils/chat-message-util'
import { calculateCost } from '../../ai/utils/cost'
import { getProjectById, bumpProjectUpdatedAt } from '../../db/project-queries'
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChat,
  updateChatTitleById
} from '../../db/queries'
import { enqueueAndProcess, logEnqueueFailure } from '../../jobs/worker'
import { logger } from '../../logger'
import { bindTraceAttributes } from '../../logger/trace-context'
import {
  resolveSearchProvider,
  searchWithFallback
} from '../../search/resolve-search-provider'
import { postRequestBodySchema, updateChatSchema } from '../schemas/chat'
import { Variables } from '../types'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  updateSuccessResponse,
  validateSchema
} from '../utils'
import {
  EMPTY_TURN_MESSAGE,
  extractToolErrorMessage,
  isEmptyAssistantTurn,
  toFriendlyChatError
} from './chat-errors'
import { stripId, toDbRow, withRunId } from './chat-persistence'
import { createSseWriter } from './chat-sse'

const chat = new Hono<{ Variables: Variables }>()

chat.get('/search', async (c) => {
  const query = c.req.query('query') ?? ''
  const settings = c.get('settings')
  const result = await handleDatabaseOperation(
    () => searchWithFallback(settings, query),
    'Failed to search messages'
  )
  return successResponse(c, result)
})

chat.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const messages = await handleDatabaseOperation(
    () => getMessagesByChatId({ id }),
    'Failed to get messages'
  )
  return successResponse(c, messages)
})

chat.post('/', async (c) => {
  const { id, messages, advancedTools, reasoningEffort, projectId } =
    validateSchema(
      postRequestBodySchema,
      await c.req.json(),
      'Invalid request body'
    )
  bindTraceAttributes({ chatId: id })
  const setting = c.get('settings')
  const { model, apiKey } = getModelFromProvider(setting)

  // `messages` is validated by a loose schema (unknown keys pass through so
  // prior turns keep their toolResult `details` etc.); its inferred shape has
  // an index signature that no longer narrows to ChatMessage directly.
  const allMessages = messages as unknown as ChatMessage[]

  // The last message is the new user message; everything before is context.
  // Its id names the run every message it produces belongs to.
  const userMessage = withRunId(allMessages.at(-1)!, allMessages.at(-1)!.id)
  const runId = userMessage.id

  // Create chat record if new
  const existingChat = await getChatById({ id })
  let titlePromise: Promise<string> | null = null
  if (!existingChat) {
    await saveChat({ id, title: 'New chat', projectId })
    if (projectId) {
      bumpProjectUpdatedAt({ id: projectId }).catch((err) => {
        logger.warn('chat', 'Failed to bump project updatedAt', {
          projectId,
          error: String(err)
        })
      })
    }
    titlePromise = generateTitleFromUserMessage({
      message: userMessage,
      model,
      apiKey
    })
  }

  const memoryConfig = setting.memory
  const lcmEnabled = memoryConfig?.lcmEnabled !== false
  // Two independent switches: capture new memories vs. surface them into chats.
  const memoryCapture = memoryConfig?.autoCapture !== false
  const memoryUseInChat = memoryConfig?.useInChat !== false

  // ── PRE-CHAT: run independent tasks in parallel ─────────────────────────
  // 1. Save user message (fire-and-forget — ID already generated)
  // 2. Assemble LCM context (or fallback to client messages)
  // 3. Load relevant memories (LLM call to filter)
  // 4. Fetch MCP tools
  // All four are independent and can run concurrently.

  // Single LcmManager instance — reused for post-chat compaction
  const lcm = lcmEnabled
    ? new LcmManager(id, model, apiKey, {
        freshTailRuns: freshTailRuns(memoryConfig),
        contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75
      })
    : null

  const saveUserMsgPromise = saveMessages({
    messages: [toDbRow(userMessage, id)]
  })
  // `index-message` only feeds Elasticsearch — the built-in PGlite search reads
  // the `message` table directly. Without ES there is no job to run, so don't
  // queue (and have the worker read, resolve settings for, and clear) one per
  // message.
  const indexesMessages = resolveSearchProvider(setting).elasticsearch !== null
  const indexMessage = (row: ReturnType<typeof toDbRow>) => {
    if (!indexesMessages) return
    enqueueAndProcess('index-message', row).catch((error) =>
      logEnqueueFailure('index-message', error)
    )
  }
  indexMessage(toDbRow(userMessage, id))

  const lcmPromise = lcm
    ? lcm
        .trackNewMessages([
          { id: userMessage.id, content: userMessage.content }
        ])
        .then(() => lcm.assembleContext())
        .then((assembled) => assembled.messages.slice(0, -1))
    : Promise.resolve(allMessages.slice(0, -1).map(stripId))

  const memoryPromise = memoryUseInChat
    ? loadRelevantMemories(getTextFromMessage(userMessage), model, apiKey, id)
        .then(formatMemoriesForSystem)
        .catch((err) => {
          logger.warn('chat', 'Memory loading failed, continuing without', {
            error: String(err)
          })
          return ''
        })
    : Promise.resolve('')

  const mcpPromise = getMcpTools()

  const [contextMessages, memoriesSection, , mcpTools] = await Promise.all([
    lcmPromise,
    memoryPromise,
    saveUserMsgPromise,
    mcpPromise
  ])

  const tools = bindCallingTools({
    advancedTools,
    setting,
    chatModel: model,
    apiKey,
    mcpTools,
    chatId: id
  })
  // Load project instructions if applicable
  let projectInstructions = ''
  if (projectId) {
    const existingChatRecord = existingChat ?? (await getChatById({ id }))
    if (existingChatRecord?.useProjectInstructions !== false) {
      const proj = await getProjectById({ id: projectId })
      if (proj) {
        if (proj.instructions) {
          projectInstructions += `\n\n<project_instructions>\n${proj.instructions}\n</project_instructions>`
        }
        if (proj.structuredInstructions) {
          const si = proj.structuredInstructions
          const parts: string[] = []
          if (si.role) parts.push(`Role: ${si.role}`)
          if (si.tone) parts.push(`Tone: ${si.tone}`)
          if (si.responseFormat)
            parts.push(`Response Format: ${si.responseFormat}`)
          if (si.constraints) parts.push(`Constraints: ${si.constraints}`)
          if (parts.length > 0) {
            projectInstructions += `\n\n<project_guidelines>\n${parts.join('\n')}\n</project_guidelines>`
          }
        }
      }
    }
  }

  const personalityPrompt = buildPersonalityPrompt(setting)
  const skillsSection = await getActiveSkillsContent()
  logger.info('chat', 'skill injection', {
    deepResearch: advancedTools?.includes(AdvancedTools.DeepResearch) ?? false,
    skillsBytes: skillsSection.length
  })
  const systemContent = advancedTools?.includes(AdvancedTools.DeepResearch)
    ? deepResearchBootPrompt
    : getSystemPrompt() +
      personalityPrompt +
      projectInstructions +
      memoriesSection +
      skillsSection

  // Build SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const sse = createSseWriter(controller)
      const sendEvent = (event: ChatSseEvent) => sse.send(event)

      let assistantMsgId = uuidV4()
      let currentAssistantMsg: ChatAssistantMessage | null = null
      const newMessages: ChatMessage[] = []
      // Stable message id per in-flight tool call, assigned at
      // `tool_execution_start`. Streaming `tool_execution_update` frames (used by
      // `computerUse` to drive its live chat panel) and the final
      // `tool_execution_end` message all reuse it, so the renderer upserts one
      // card in place instead of flashing a new one per frame. Must be a UUID —
      // the id lands in the `message.id` uuid column on save.
      const toolMsgIds = new Map<string, string>()
      // Wall-clock turn start — used to stamp the last assistant message with
      // an accurate durationMs that the UI can show as "Worked for X seconds".
      const turnStartedAt = Date.now()

      try {
        // Deep Research forces a strong reasoning effort regardless of what
        // the composer's picker requested. pi's ThinkingLevel has every tier
        // of the app's EffortLevel but 'off', which is "no reasoning option".
        const effectiveReasoning = advancedTools?.includes(
          AdvancedTools.DeepResearch
        )
          ? 'high'
          : reasoningEffort && reasoningEffort !== 'off'
            ? reasoningEffort
            : undefined

        const agentStream = agentLoop(
          [stripId(userMessage) as AgentMessage],
          {
            systemPrompt: systemContent,
            messages: contextMessages,
            tools
          },
          {
            model,
            apiKey,
            reasoning: effectiveReasoning,
            convertToLlm: (agentMessages: AgentMessage[]): Message[] => {
              const messages = agentMessages.filter(
                (m): m is Message =>
                  (m as Message).role === 'user' ||
                  (m as Message).role === 'assistant' ||
                  (m as Message).role === 'toolResult'
              )
              // Context is assembled in whole runs, so this never fires;
              // it is the last line of defence against a 400 from the
              // provider (a tool result without its tool call). Thinking
              // blocks and cross-provider handoff are pi 0.85's job.
              const { messages: safe, dropped } = dropBrokenRuns(messages)
              if (dropped > 0) {
                logger.error(
                  'chat',
                  'Dropped runs that would have broken the provider request',
                  { chatId: id, dropped }
                )
              }
              return safe
            }
          },
          c.req.raw.signal,
          streamFn
        )

        for await (const event of agentStream) {
          if (event.type === 'message_update') {
            const msg = event.message as Message
            if (msg.role !== 'assistant') continue
            const assistantMsg = msg as Message & { role: 'assistant' }
            currentAssistantMsg = {
              id: assistantMsgId,
              runId,
              role: 'assistant',
              content: assistantMsg.content,
              usage: assistantMsg.usage,
              api: assistantMsg.api,
              provider: assistantMsg.provider,
              model: assistantMsg.model,
              stopReason: assistantMsg.stopReason,
              timestamp: assistantMsg.timestamp ?? Date.now()
            }
            // Coalesced, not sent per delta — see STREAM_FLUSH_INTERVAL_MS.
            sse.queueUpdate(currentAssistantMsg)
          } else if (event.type === 'message_end') {
            const msg = event.message as Message
            if (msg.role === 'assistant') {
              const assistantMsg = msg as Message & { role: 'assistant' }
              // pi-ai surfaces provider failures (e.g. an OpenAI 4xx on the
              // request) as an assistant message with stopReason 'error' and the
              // detail on `errorMessage` — it does NOT throw. Without this guard
              // the turn was saved as an empty assistant message and the user
              // saw "no response" with no explanation. Re-throw so the catch
              // below logs the real error and streams it to the client.
              if (assistantMsg.stopReason === 'error') {
                throw new Error(
                  assistantMsg.errorMessage ||
                    'The model returned an error without details.'
                )
              }
              // Background/async "pro" models (e.g. gpt-5.5-pro) can end the
              // stream without a `response.completed` event — pi-ai then yields
              // a normal 'stop' message with empty content and zero tokens.
              // Accepting it silently drops the answer (and any artifact) and
              // pins the cost readout at $0, with no error shown. Surface it.
              if (isEmptyAssistantTurn(assistantMsg)) {
                // Stop pressed before the first token: nothing to keep, and
                // not a failure either.
                if (assistantMsg.stopReason === 'aborted') {
                  currentAssistantMsg = null
                  continue
                }
                throw new Error(EMPTY_TURN_MESSAGE)
              }
              // The last deltas may still be waiting on the flush interval.
              sse.flush()
              // Use streaming content from currentAssistantMsg but authoritative
              // usage/stopReason from event.message (message_update carries 0 usage)
              const cost = calculateCost(assistantMsg.usage, model)
              const finalMsg: ChatAssistantMessage = {
                id: currentAssistantMsg?.id ?? assistantMsgId,
                runId,
                role: 'assistant',
                content: currentAssistantMsg?.content ?? assistantMsg.content,
                usage: assistantMsg.usage,
                cost,
                api: assistantMsg.api,
                provider: assistantMsg.provider,
                model: assistantMsg.model,
                stopReason: assistantMsg.stopReason,
                timestamp: assistantMsg.timestamp ?? Date.now()
              }
              newMessages.push(finalMsg)
              assistantMsgId = uuidV4()
              currentAssistantMsg = null
            }
          } else if (event.type === 'tool_execution_start') {
            toolMsgIds.set(event.toolCallId, uuidV4())
            sendEvent({
              type: 'tool_call_start',
              toolCallId: event.toolCallId,
              toolName: event.toolName
            })
          } else if (event.type === 'tool_execution_update') {
            // Relay a tool's mid-execution progress (`onUpdate`) to the renderer
            // as a live tool-result message. Only `computerUse` streams these
            // today; its `ComputerUseCard` reads the evolving `details`. Not
            // pushed to `newMessages` — the authoritative row is written at
            // `tool_execution_end`.
            const partial = event.partialResult as {
              content?: Array<{ type: 'text'; text: string }>
              details?: unknown
            } | null
            sendEvent({
              type: 'message_update',
              message: {
                id: toolMsgIds.get(event.toolCallId) ?? uuidV4(),
                runId,
                role: 'toolResult',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                content: Array.isArray(partial?.content) ? partial.content : [],
                details: partial?.details ?? null,
                isError: false,
                timestamp: Date.now()
              }
            })
          } else if (event.type === 'tool_execution_end') {
            // Extract error message from various possible shapes:
            // 1. AgentToolResult: { content: [{ type: 'text', text: '...' }], details: {} }
            // 2. Raw Error object: { message: '...' }
            // 3. Plain string
            const errorMessage = event.isError
              ? extractToolErrorMessage(event.result)
              : null

            const details =
              !event.isError &&
              event.result &&
              typeof event.result === 'object' &&
              'details' in event.result
                ? event.result.details
                : event.isError
                  ? null
                  : event.result

            // Use the tool's own content if provided (allows tools to control
            // exactly what text the LLM sees, e.g. formatted citations prompt).
            // Fall back to JSON-serialising details for tools that don't set content.
            const resultObj = event.result as {
              content?: Array<{ type: string; text?: string }>
            } | null
            const hasContentArray =
              resultObj &&
              typeof resultObj === 'object' &&
              'content' in resultObj &&
              Array.isArray(resultObj.content)

            const toolContent: Array<{ type: 'text'; text: string }> =
              hasContentArray
                ? (resultObj.content as Array<{ type: 'text'; text: string }>)
                : errorMessage
                  ? [{ type: 'text' as const, text: errorMessage }]
                  : details
                    ? [
                        {
                          type: 'text' as const,
                          text:
                            typeof details === 'string'
                              ? details
                              : JSON.stringify(details)
                        }
                      ]
                    : []

            const toolResultMsg: ChatToolResultMessage = {
              id: toolMsgIds.get(event.toolCallId) ?? uuidV4(),
              runId,
              role: 'toolResult',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              content: toolContent,
              details,
              isError: event.isError,
              timestamp: Date.now()
            }
            toolMsgIds.delete(event.toolCallId)
            newMessages.push(toolResultMsg)
            sendEvent({ type: 'message_update', message: toolResultMsg })

            // Relay a non-fatal tool notice (e.g. an expired API key that only
            // degraded enrichment — the tool still succeeded) so the renderer
            // can toast it. Tools opt in by putting `notice` on their details.
            const notice =
              details && typeof details === 'object' && 'notice' in details
                ? (details as { notice?: unknown }).notice
                : null
            if (
              notice &&
              typeof notice === 'object' &&
              typeof (notice as ToolNotice).message === 'string'
            ) {
              const n = notice as ToolNotice
              sendEvent({
                type: 'notice',
                level: n.level === 'info' ? 'info' : 'warning',
                message: n.message
              })
            }

            sendEvent({
              type: 'tool_call_end',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              isError: event.isError
            })
          }
        }

        // Generate title for new chats
        if (titlePromise) {
          const title = await titlePromise
          sendEvent({ type: 'title', title })
          updateChatTitleById({ id, title }).catch((err) => {
            logger.error('chat', 'Failed to persist chat title', {
              chatId: id,
              error: String(err)
            })
          })
        }

        // Send done event
        sendEvent({
          type: 'done',
          messages: [...allMessages, ...stampTurnDuration()]
        })
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err)
        logger.error('chat', 'Chat stream error', { error: String(rawMsg) })
        sendEvent({ type: 'error', error: toFriendlyChatError(rawMsg) })
      } finally {
        // Runs however the turn ended. It used to sit at the end of the `try`,
        // so a turn that threw midway (a provider error on step three) — or
        // whose client had gone (Stop cancels the response stream, and the next
        // write threw) — saved nothing: the tool calls had really run and were
        // on screen, then vanished on reload and were missing from LCM's
        // context. The stream stays open until the rows are written, as before.
        await persistTurn().catch((error) => {
          logger.error('chat', 'Failed to persist chat turn', {
            chatId: id,
            errorName: error instanceof Error ? error.name : typeof error
          })
        })
        sse.close()
      }

      // Stamp turn duration on the last assistant message of this turn so
      // the UI can show a precise "Worked for X seconds" — even for
      // single-message turns where pi-ai's stream-START timestamp would
      // otherwise leave us without a useful diff.
      function stampTurnDuration(): ChatMessage[] {
        const turnDurationMs = Date.now() - turnStartedAt
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant') {
            ;(newMessages[i] as ChatAssistantMessage).durationMs ??=
              turnDurationMs
            break
          }
        }
        return newMessages
      }

      async function persistTurn() {
        if (newMessages.length === 0) return
        const rows = stampTurnDuration().map((m) => toDbRow(m, id))
        await saveMessages({ messages: rows })
        rows.forEach(indexMessage)

        // ── POST-CHAT: enqueue background jobs (non-blocking) ───────────────
        if (lcm) {
          enqueueAndProcess('lcm-post-turn', {
            chatId: id,
            model,
            apiKey,
            freshTailRuns: freshTailRuns(memoryConfig),
            contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75,
            newMessages: newMessages.map((m) => ({
              id: m.id,
              content: m.content
            }))
          }).catch((error) => logEnqueueFailure('lcm-post-turn', error))
        }

        if (memoryCapture) {
          enqueueAndProcess('memory-consolidate', {
            messages: [...allMessages, ...newMessages].map((m) => ({
              role: m.role,
              content: m.content
            })),
            model,
            apiKey
          }).catch((error) => logEnqueueFailure('memory-consolidate', error))
        }
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

chat.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')

  await handleDatabaseOperation(
    () => deleteChatById({ id }),
    'Failed to delete chat'
  )

  const { elasticsearch } = resolveSearchProvider(c.get('settings'))
  if (elasticsearch) {
    elasticsearch.deleteByChatId(id).catch((error) => {
      logger.error('search', 'Failed to delete chat from Elasticsearch', {
        error: String(error)
      })
    })
  }

  return deletionSuccessResponse(c, 'Chat')
})

chat.put('/', async (c) => {
  const payload = validateSchema(
    updateChatSchema,
    await c.req.json(),
    'Invalid request body'
  )

  if (!payload.id) {
    throw new NotFoundError(ErrorCode.CHAT_NOT_FOUND, 'Chat ID is required')
  }

  await handleDatabaseOperation(
    () => updateChat(payload),
    'Failed to update chat'
  )

  return updateSuccessResponse(c, 'chat', payload.id)
})

export default chat
