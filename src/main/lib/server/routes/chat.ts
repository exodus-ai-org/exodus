import type { AgentMessage } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
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
import {
  formatMemoriesForSystem,
  loadRelevantMemories,
  runMemoryWriteJudge,
  saveSessionSummary
} from '../../ai/memory/manager'
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider,
  getTextFromMessage
} from '../../ai/utils/chat-message-util'
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
import { ChatSDKError } from '../errors'
import { postRequestBodySchema, updateChatSchema } from '../schemas/chat'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  updateSuccessResponse,
  validateSchema
} from '../utils'

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
  const id = getRequiredParam(c, 'id', 'chat')
  const messages = await handleDatabaseOperation(
    () => getMessagesByChatId({ id }),
    'Failed to get messages'
  )
  return successResponse(c, messages)
})

// Strip `id` from ChatMessage to get a pi-ai Message
function stripId(msg: ChatMessage): Message {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = msg
  return rest as Message
}

// Convert a ChatMessage to a DB row for insertion
function toDbRow(msg: ChatMessage, chatId: string) {
  const ts = msg.timestamp ? new Date(msg.timestamp) : new Date()
  const base = {
    id: msg.id,
    chatId,
    role: msg.role,
    content: msg.content,
    createdAt: isNaN(ts.getTime()) ? new Date() : ts
  }

  if (msg.role === 'assistant') {
    return {
      ...base,
      usage: msg.usage ?? null,
      api: msg.api ?? null,
      provider: msg.provider ?? null,
      model: msg.model ?? null,
      stopReason: msg.stopReason ?? null,
      errorMessage: msg.errorMessage ?? null,
      toolCallId: null,
      toolName: null,
      details: null,
      isError: null
    }
  }

  if (msg.role === 'toolResult') {
    return {
      ...base,
      usage: null,
      api: null,
      provider: null,
      model: null,
      stopReason: null,
      errorMessage: null,
      toolCallId: msg.toolCallId,
      toolName: msg.toolName,
      details: msg.details ?? null,
      isError: msg.isError
    }
  }

  // user
  return {
    ...base,
    usage: null,
    api: null,
    provider: null,
    model: null,
    stopReason: null,
    errorMessage: null,
    toolCallId: null,
    toolName: null,
    details: null,
    isError: null
  }
}

chat.post('/', async (c) => {
  const { id, messages, advancedTools } = validateSchema(
    postRequestBodySchema,
    await c.req.json(),
    'chat',
    'Invalid request body'
  )
  const setting = c.get('setting')
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
    await saveChat({ id, title: 'New chat' })
    titlePromise = generateTitleFromUserMessage({
      message: userMessage,
      model: chatModel,
      apiKey
    })
  }

  // Save the user message to DB immediately
  await saveMessages({ messages: [toDbRow(userMessage, id)] })

  const memoryConfig = setting.memoryLayer
  const lcmEnabled = memoryConfig?.lcmEnabled !== false
  const memoryAutoWrite = memoryConfig?.autoWrite !== false

  // ── PRE-CHAT: assemble context via LCM (if enabled) ──────────────────────
  let contextMessages: Message[]

  if (lcmEnabled) {
    const lcm = new LcmManager(id, chatModel, apiKey, {
      freshTailSize: memoryConfig?.freshTailSize ?? 16,
      contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75
    })

    // Track the new user message
    await lcm.trackNewMessages([
      { id: userMessage.id, content: userMessage.content }
    ])

    const assembled = await lcm.assembleContext()
    // Use assembled context minus the last message (agentLoop receives userMessage separately)
    contextMessages = assembled.messages.slice(0, -1)

    // ── POST-CHAT: compact + memory (fire & forget) ────────────────────────
    // We attach to the stream's close event below
    ;(async () => {
      await new Promise<void>((resolve) => {
        // Small delay to let stream complete
        setTimeout(resolve, 500)
      })
      lcm.compactAfterTurn().catch(console.error)
    })()
  } else {
    // Fallback: use messages passed from client directly
    contextMessages = allMessages.slice(0, -1).map(stripId)
  }

  // ── PRE-CHAT: load relevant user memories ─────────────────────────────────
  let memoriesSection = ''
  if (memoryAutoWrite) {
    const userText = getTextFromMessage(userMessage)
    const relevantMemories = await loadRelevantMemories(
      userText,
      chatModel,
      apiKey
    )
    memoriesSection = formatMemoriesForSystem(relevantMemories)
  }

  const activeModel = isReasoningModel ? reasoningModel : chatModel
  const tools = bindCallingTools({ advancedTools, setting, chatModel, apiKey })
  const systemContent = advancedTools?.includes(AdvancedTools.DeepResearch)
    ? deepResearchBootPrompt
    : systemPrompt + memoriesSection

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
            convertToLlm: (agentMessages: AgentMessage[]): Message[] => {
              return agentMessages
                .filter(
                  (m): m is Message =>
                    (m as Message).role === 'user' ||
                    (m as Message).role === 'assistant' ||
                    (m as Message).role === 'toolResult'
                )
                .map((m) => {
                  if (m.role !== 'assistant') return m
                  // Strip thinking blocks before sending history back to the LLM.
                  // The OpenAI Responses API embeds rs_* IDs in thinkingSignature to
                  // reference stored reasoning items, but store:false means those items
                  // are never persisted — subsequent turns get a 404 when referenced.
                  const assistantMsg = m as Message & {
                    role: 'assistant'
                    content: Array<{ type: string }>
                  }
                  return {
                    ...assistantMsg,
                    content: assistantMsg.content.filter(
                      (b) => b.type !== 'thinking'
                    )
                  } as Message
                })
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
              const finalMsg: ChatAssistantMessage = {
                id: currentAssistantMsg?.id ?? assistantMsgId,
                role: 'assistant',
                content: currentAssistantMsg?.content ?? assistantMsg.content,
                usage: assistantMsg.usage,
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
          } else if (event.type === 'tool_execution_end') {
            const details =
              event.result &&
              typeof event.result === 'object' &&
              'details' in event.result
                ? event.result.details
                : event.result

            const toolResultMsg: ChatToolResultMessage = {
              id: uuidV4(),
              role: 'toolResult',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              content: details
                ? [
                    {
                      type: 'text' as const,
                      text:
                        typeof details === 'string'
                          ? details
                          : JSON.stringify(details)
                    }
                  ]
                : [],
              details,
              isError: event.isError,
              timestamp: Date.now()
            }
            newMessages.push(toolResultMsg)
            sendEvent({ type: 'message_update', message: toolResultMsg })
          }
        }

        // Generate title for new chats
        if (titlePromise) {
          const title = await titlePromise
          sendEvent({ type: 'title', title })
          updateChatTitleById({ id, title })
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
        if (memoryAutoWrite && newMessages.length > 0) {
          const allSavedMessages = [...allMessages, ...newMessages]
          Promise.resolve().then(async () => {
            const lcm = new LcmManager(id, chatModel, apiKey, {
              freshTailSize: memoryConfig?.freshTailSize ?? 16,
              contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75
            })
            // Track new messages in LCM
            await lcm.trackNewMessages(
              newMessages.map((m) => ({ id: m.id, content: m.content }))
            )
            // Compact if needed
            lcm.compactAfterTurn().catch(console.error)
            // Memory write judge
            runMemoryWriteJudge(
              allSavedMessages.map((m) => ({
                role: m.role,
                content: m.content
              })),
              chatModel,
              apiKey
            ).catch(console.error)
            // Session summary
            saveSessionSummary(
              id,
              allSavedMessages.map((m) => ({
                role: m.role,
                content: m.content
              })),
              chatModel,
              apiKey
            ).catch(console.error)
          })
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('Chat stream error:', errMsg)
        sendEvent({ type: 'error', error: errMsg })
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
  const id = getRequiredParam(c, 'id', 'chat')

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
    'chat',
    'Invalid request body'
  )

  if (!payload.id) {
    throw new ChatSDKError('not_found:chat', 'Chat ID is required')
  }

  await handleDatabaseOperation(
    () => updateChat(payload),
    'Failed to update chat'
  )

  return updateSuccessResponse(c, 'chat', payload.id)
})

export default chat
