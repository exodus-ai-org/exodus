import type { AgentMessage } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError } from '@shared/errors/app-error'
import { AdvancedTools } from '@shared/types/ai'
import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatSseEvent,
  ChatToolResultMessage
} from '@shared/types/chat'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { v4 as uuidV4 } from 'uuid'

import { LcmManager } from '../../ai/context-management'
import { getMcpTools } from '../../ai/mcp'
import {
  formatMemoriesForSystem,
  loadRelevantMemories,
  runMemoryWriteJudge,
  saveSessionSummary
} from '../../ai/memory/manager'
import {
  buildPersonalityPrompt,
  deepResearchBootPrompt,
  getSystemPrompt
} from '../../ai/prompts'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider,
  getTextFromMessage
} from '../../ai/utils/chat-message-util'
import { calculateCost } from '../../ai/utils/cost'
import { transformMessages } from '../../ai/utils/transform-messages'
import { getProjectById, bumpProjectUpdatedAt } from '../../db/project-queries'
import {
  deleteChatById,
  fullTextSearchOnMessages,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChat,
  updateChatTitleById
} from '../../db/queries'
import { logger } from '../../logger'
import { postRequestBodySchema, updateChatSchema } from '../schemas/chat'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  updateSuccessResponse,
  validateSchema
} from '../utils'
import { extractToolErrorMessage, toFriendlyChatError } from './chat-errors'
import { stripId, toDbRow } from './chat-persistence'

const chat = new Hono<{ Variables: Variables }>()

chat.get('/search', async (c) => {
  const query = c.req.query('query') ?? ''
  const result = await handleDatabaseOperation(
    () => fullTextSearchOnMessages(query),
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
  const { id, messages, advancedTools, projectId } = validateSchema(
    postRequestBodySchema,
    await c.req.json(),
    'Invalid request body'
  )
  const setting = c.get('settings')
  const { chatModel, reasoningModel, apiKey } = getModelFromProvider(setting)
  const isReasoningModel =
    advancedTools?.includes(AdvancedTools.Reasoning) ||
    advancedTools?.includes(AdvancedTools.DeepResearch)

  const allMessages = messages as ChatMessage[]

  // The last message is the new user message; everything before is context
  const userMessage = allMessages.at(-1)!

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
      model: chatModel,
      apiKey
    })
  }

  const memoryConfig = setting.memoryLayer
  const lcmEnabled = memoryConfig?.lcmEnabled !== false
  const memoryAutoWrite = memoryConfig?.autoWrite !== false

  // ── PRE-CHAT: run independent tasks in parallel ─────────────────────────
  // 1. Save user message (fire-and-forget — ID already generated)
  // 2. Assemble LCM context (or fallback to client messages)
  // 3. Load relevant memories (LLM call to filter)
  // 4. Fetch MCP tools
  // All four are independent and can run concurrently.

  // Single LcmManager instance — reused for post-chat compaction
  const lcm = lcmEnabled
    ? new LcmManager(id, chatModel, apiKey, {
        freshTailSize: memoryConfig?.freshTailSize ?? 16,
        contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75
      })
    : null

  const saveUserMsgPromise = saveMessages({
    messages: [toDbRow(userMessage, id)]
  })

  const lcmPromise = lcm
    ? lcm
        .trackNewMessages([
          { id: userMessage.id, content: userMessage.content }
        ])
        .then(() => lcm.assembleContext())
        .then((assembled) => assembled.messages.slice(0, -1))
    : Promise.resolve(allMessages.slice(0, -1).map(stripId))

  const memoryPromise = memoryAutoWrite
    ? loadRelevantMemories(getTextFromMessage(userMessage), chatModel, apiKey)
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

  const activeModel = isReasoningModel ? reasoningModel : chatModel
  const tools = bindCallingTools({
    advancedTools,
    setting,
    chatModel,
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
  const systemContent = advancedTools?.includes(AdvancedTools.DeepResearch)
    ? deepResearchBootPrompt
    : getSystemPrompt() +
      personalityPrompt +
      projectInstructions +
      memoriesSection

  // Build SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function sendEvent(event: ChatSseEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let assistantMsgId = uuidV4()
      let currentAssistantMsg: ChatAssistantMessage | null = null
      const newMessages: ChatMessage[] = []
      // Wall-clock turn start — used to stamp the last assistant message with
      // an accurate durationMs that the UI can show as "Worked for X seconds".
      const turnStartedAt = Date.now()

      try {
        const agentStream = agentLoop(
          [stripId(userMessage) as AgentMessage],
          {
            systemPrompt: systemContent,
            messages: contextMessages,
            tools
          },
          {
            model: activeModel,
            apiKey,
            reasoning: isReasoningModel ? 'high' : undefined,
            convertToLlm: (agentMessages: AgentMessage[]): Message[] => {
              const messages = agentMessages.filter(
                (m): m is Message =>
                  (m as Message).role === 'user' ||
                  (m as Message).role === 'assistant' ||
                  (m as Message).role === 'toolResult'
              )
              // Normalize messages for cross-provider compatibility:
              // strips thinking blocks, normalizes tool call IDs,
              // resolves orphaned tool calls, filters error/aborted messages.
              return transformMessages(messages)
            }
          },
          c.req.raw.signal
        )

        for await (const event of agentStream) {
          if (event.type === 'message_update') {
            const msg = event.message as Message
            if (msg.role !== 'assistant') continue
            const assistantMsg = msg as Message & { role: 'assistant' }
            currentAssistantMsg = {
              id: assistantMsgId,
              role: 'assistant',
              content: assistantMsg.content,
              usage: assistantMsg.usage,
              api: assistantMsg.api,
              provider: assistantMsg.provider,
              model: assistantMsg.model,
              stopReason: assistantMsg.stopReason,
              timestamp: assistantMsg.timestamp ?? Date.now()
            }
            sendEvent({ type: 'message_update', message: currentAssistantMsg })
          } else if (event.type === 'message_end') {
            const msg = event.message as Message
            if (msg.role === 'assistant') {
              const assistantMsg = msg as Message & { role: 'assistant' }
              // Use streaming content from currentAssistantMsg but authoritative
              // usage/stopReason from event.message (message_update carries 0 usage)
              const cost = calculateCost(assistantMsg.usage, activeModel)
              const finalMsg: ChatAssistantMessage = {
                id: currentAssistantMsg?.id ?? assistantMsgId,
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
            sendEvent({
              type: 'tool_call_start',
              toolCallId: event.toolCallId,
              toolName: event.toolName
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
              id: uuidV4(),
              role: 'toolResult',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              content: toolContent,
              details,
              isError: event.isError,
              timestamp: Date.now()
            }
            newMessages.push(toolResultMsg)
            sendEvent({ type: 'message_update', message: toolResultMsg })
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

        // Stamp turn duration on the last assistant message of this turn so
        // the UI can show a precise "Worked for X seconds" — even for
        // single-message turns where pi-ai's stream-START timestamp would
        // otherwise leave us without a useful diff.
        const turnDurationMs = Date.now() - turnStartedAt
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant') {
            ;(newMessages[i] as ChatAssistantMessage).durationMs =
              turnDurationMs
            break
          }
        }

        // Send done event
        sendEvent({
          type: 'done',
          messages: [...allMessages, ...newMessages]
        })

        // Persist new messages to DB
        if (newMessages.length > 0) {
          await saveMessages({
            messages: newMessages.map((m) => toDbRow(m, id))
          })
        }

        // ── POST-CHAT: async memory operations (non-blocking) ──────────────
        if (newMessages.length > 0) {
          const allSavedMessages = [...allMessages, ...newMessages]
          Promise.resolve()
            .then(async () => {
              // LCM: track new messages and compact — reuse pre-chat instance
              if (lcm) {
                await lcm.trackNewMessages(
                  newMessages.map((m) => ({ id: m.id, content: m.content }))
                )
                lcm.compactAfterTurn().catch((err) => {
                  logger.error('chat', 'LCM compactAfterTurn failed', {
                    error: String(err)
                  })
                })
              }

              // Memory write judge + session summary — gated on memoryAutoWrite
              if (memoryAutoWrite) {
                runMemoryWriteJudge(
                  allSavedMessages.map((m) => ({
                    role: m.role,
                    content: m.content
                  })),
                  chatModel,
                  apiKey
                ).catch((err) => {
                  logger.error('chat', 'Memory write judge failed', {
                    error: String(err)
                  })
                })
                saveSessionSummary(
                  id,
                  allSavedMessages.map((m) => ({
                    role: m.role,
                    content: m.content
                  })),
                  chatModel,
                  apiKey
                ).catch((err) => {
                  logger.error('chat', 'Session summary failed', {
                    error: String(err)
                  })
                })
              }
            })
            .catch((err) => {
              logger.error('chat', 'Post-response operation failed', {
                error: String(err)
              })
            })
        }
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err)
        logger.error('chat', 'Chat stream error', { error: String(rawMsg) })
        sendEvent({ type: 'error', error: toFriendlyChatError(rawMsg) })
      } finally {
        controller.close()
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
