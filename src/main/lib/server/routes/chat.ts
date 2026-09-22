import { ErrorCode } from '@exodus/shared/constants/error-codes'
import { TOOL_NAMES, toToolName } from '@exodus/shared/constants/tool-names'
import { NotFoundError, ValidationError } from '@exodus/shared/errors/app-error'
import { AdvancedTools } from '@exodus/shared/types/ai'
import type { ChatMessage, ToolNotice } from '@exodus/shared/types/chat'
import { Hono } from 'hono'

import { LcmManager, freshTailRuns } from '../../ai/context-management'
import { RunRecorder } from '../../ai/kernel/record'
import { runAgent } from '../../ai/kernel/run'
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
import { toFriendlyChatError } from './chat-errors'
import { stripId, toDbRow, withRunId } from './chat-persistence'
import { createSseWriter } from './chat-sse'

const chat = new Hono<{ Variables: Variables }>()

/** A tool's opt-in notice on its `details`, if it is well-formed. */
function noticeOf(details: unknown): ToolNotice | null {
  const n =
    details && typeof details === 'object' && 'notice' in details
      ? (details as { notice?: unknown }).notice
      : null
  return n &&
    typeof n === 'object' &&
    typeof (n as ToolNotice).message === 'string'
    ? (n as ToolNotice)
    : null
}

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
  const last = allMessages.at(-1)!
  if (last.role !== 'user') {
    throw new ValidationError(
      ErrorCode.VALIDATION_NO_USER_MESSAGE,
      'The last message must be the user prompt'
    )
  }
  const userMessage = withRunId(last, last.id)
  /** The conversation as the client sent it, with the prompt stamped. */
  const history: ChatMessage[] = [...allMessages.slice(0, -1), userMessage]

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

  // Deep Research forces a strong reasoning effort regardless of what the
  // composer's picker requested. pi's ThinkingLevel has every tier of the
  // app's EffortLevel but 'off', which is "no reasoning option".
  const effectiveReasoning = advancedTools?.includes(AdvancedTools.DeepResearch)
    ? 'high'
    : reasoningEffort && reasoningEffort !== 'off'
      ? reasoningEffort
      : undefined

  // Tools a call to which the kernel blocks before it runs — the binder
  // does not bind them either; this covers a setting changed mid-run and
  // the model naming a tool it was not given.
  const disabledTools = new Set(
    (setting.tools?.disabledTools ?? []).map(toToolName)
  )
  if (!setting.computerUse?.enabled) disabledTools.add(TOOL_NAMES.computerUse)

  const recorder = new RunRecorder({
    chatId: id,
    model,
    apiKey,
    lcm: lcm
      ? {
          freshTailRuns: freshTailRuns(memoryConfig),
          contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75
        }
      : null,
    memoryCapture,
    indexMessage,
    priorMessages: history
  })

  // The run streams as SSE: every kernel event maps onto one wire event
  // (shapes unchanged; every message carries `runId`).
  const stream = new ReadableStream({
    async start(controller) {
      const sse = createSseWriter(controller)
      try {
        const events = runAgent({
          chatId: id,
          userMessage,
          systemPrompt: systemContent,
          contextMessages,
          tools,
          model,
          apiKey,
          reasoning: effectiveReasoning,
          signal: c.req.raw.signal,
          disabledTools
        })
        for await (const event of events) {
          recorder.observe(event)
          switch (event.type) {
            case 'message_update':
              // Coalesced, not sent per delta — see STREAM_FLUSH_INTERVAL_MS.
              sse.queueUpdate(event.message)
              break
            case 'message_end':
              // The last deltas may still be waiting on the flush interval.
              sse.flush()
              break
            case 'tool_start':
              sse.send({
                type: 'tool_call_start',
                toolCallId: event.toolCallId,
                toolName: event.toolName
              })
              break
            case 'tool_update':
              sse.send({ type: 'message_update', message: event.message })
              break
            case 'tool_end': {
              sse.send({ type: 'message_update', message: event.message })
              // A non-fatal tool notice (e.g. an expired API key that only
              // degraded enrichment — the tool still succeeded), so the
              // renderer can toast it. Tools opt in via `details.notice`.
              const notice = noticeOf(event.message.details)
              if (notice) {
                sse.send({
                  type: 'notice',
                  level: notice.level === 'info' ? 'info' : 'warning',
                  message: notice.message
                })
              }
              sse.send({
                type: 'tool_call_end',
                toolCallId: event.message.toolCallId,
                toolName: event.message.toolName,
                isError: event.message.isError
              })
              break
            }
            case 'run_end':
              if (titlePromise) {
                const title = await titlePromise
                sse.send({ type: 'title', title })
                updateChatTitleById({ id, title }).catch((err) => {
                  logger.error('chat', 'Failed to persist chat title', {
                    chatId: id,
                    error: String(err)
                  })
                })
              }
              sse.send({
                type: 'done',
                messages: [...history, ...event.messages]
              })
              break
            case 'error':
              logger.error('chat', 'Chat stream error', { error: event.error })
              sse.send({
                type: 'error',
                error: toFriendlyChatError(event.error)
              })
              break
          }
        }
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err)
        logger.error('chat', 'Chat stream error', { error: raw })
        sse.send({ type: 'error', error: toFriendlyChatError(raw) })
      } finally {
        // Runs however the run ended — done, a provider error midway, or Stop
        // (the client hung up, and the next write threw): the steps that
        // completed are saved. The stream stays open until the rows are
        // written.
        await recorder.persist().catch((error) => {
          logger.error('chat', 'Failed to persist chat run', {
            chatId: id,
            errorName: error instanceof Error ? error.name : typeof error
          })
        })
        sse.close()
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
