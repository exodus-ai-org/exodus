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
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider
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
  const contextMessages = allMessages.slice(0, -1)

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

  const activeModel = isReasoningModel ? reasoningModel : chatModel
  const tools = bindCallingTools({ advancedTools, setting })
  const systemContent = advancedTools?.includes(AdvancedTools.DeepResearch)
    ? deepResearchBootPrompt
    : systemPrompt

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
            messages: contextMessages.map(stripId),
            tools
          },
          {
            model: activeModel,
            apiKey,
            convertToLlm: (agentMessages: AgentMessage[]): Message[] => {
              return agentMessages.filter(
                (m): m is Message =>
                  (m as Message).role === 'user' ||
                  (m as Message).role === 'assistant' ||
                  (m as Message).role === 'toolResult'
              )
            }
          },
          c.req.raw.signal
        )

        for await (const event of agentStream) {
          if (event.type === 'message_update') {
            const msg = event.message as Message & { role: 'assistant' }
            currentAssistantMsg = {
              id: assistantMsgId,
              role: 'assistant',
              content: msg.content,
              usage: msg.usage,
              api: msg.api,
              provider: msg.provider,
              model: msg.model,
              stopReason: msg.stopReason,
              timestamp: msg.timestamp ?? Date.now()
            }
            sendEvent({ type: 'message_update', message: currentAssistantMsg })
          } else if (event.type === 'message_end') {
            if (currentAssistantMsg) {
              newMessages.push(currentAssistantMsg)
            }
            assistantMsgId = uuidV4()
            currentAssistantMsg = null
          } else if (event.type === 'tool_execution_start') {
            if (currentAssistantMsg) {
              currentAssistantMsg = {
                ...currentAssistantMsg,
                content: [
                  ...currentAssistantMsg.content,
                  {
                    type: 'toolCall' as const,
                    id: event.toolCallId,
                    name: event.toolName,
                    arguments: event.args as Record<string, unknown>
                  }
                ]
              }
              sendEvent({
                type: 'message_update',
                message: currentAssistantMsg
              })
            }
          } else if (event.type === 'tool_execution_end') {
            // Extract the actual details from AgentToolResult wrapper
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

        // Send done event with the complete conversation
        sendEvent({
          type: 'done',
          messages: [...allMessages, ...newMessages]
        })

        // Persist new assistant/toolResult messages to DB
        if (newMessages.length > 0) {
          await saveMessages({
            messages: newMessages.map((m) => toDbRow(m, id))
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
