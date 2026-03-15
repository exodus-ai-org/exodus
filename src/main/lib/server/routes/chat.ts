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
import { getMcpTools } from '../../ai/mcp'
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import { getActiveSkillsContent } from '../../ai/skills/skills-manager'
import {
  bindCallingTools,
  convertToUIMessages,
  generateTitleFromUserMessage,
  getModelFromProvider
} from '../../ai/utils/chat-message-util'
import {
  dbMessageToChatMessage,
  deleteChatById,
  fullTextSearchOnMessages,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChat,
  updateChatTitleById,
  updateMessage
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

chat.get('/mcp', async (c) => {
  const tools = await getMcpTools()
  return successResponse(c, { tools })
})

chat.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'chat')
  const messages = await handleDatabaseOperation(
    () => getMessagesByChatId({ id }),
    'Failed to get messages'
  )
  return successResponse(c, messages)
})

chat.get('/search', async (c) => {
  const query = c.req.query('query') ?? ''

  const result = await handleDatabaseOperation(
    () => fullTextSearchOnMessages(query),
    'Failed to search messages'
  )

  return successResponse(c, result)
})

// Convert ChatMessage[] to pi-ai Message[] (all roles)
function chatMessageToPi(msg: ChatMessage): Message {
  if (msg.role === 'user') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = msg
    return rest
  }
  if (msg.role === 'assistant') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = msg
    return rest
  }
  // toolResult
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = msg
  return rest
}

function chatMessagesToPiMessages(messages: ChatMessage[]): Message[] {
  return messages.map(chatMessageToPi)
}

chat.post('/', async (c) => {
  const { id, message, messages, advancedTools } = validateSchema(
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

  const existingChat = await getChatById({ id })
  let titlePromise: Promise<string> | null = null

  if (!existingChat) {
    await saveChat({ id, title: 'New chat' })
    const firstUserMsg =
      message ?? (messages as ChatMessage[]).find((m) => m.role === 'user')
    if (firstUserMsg) {
      titlePromise = generateTitleFromUserMessage({
        message: firstUserMsg as ChatMessage,
        model: chatModel,
        apiKey
      })
    }
  }

  const uiMessages = messages as ChatMessage[]
  const [skillsContent, mcpTools] = await Promise.all([
    getActiveSkillsContent(),
    getMcpTools()
  ])

  const activeModel = isReasoningModel ? reasoningModel : chatModel
  const tools = bindCallingTools({ advancedTools, setting, mcpTools })

  const systemContent =
    (advancedTools?.includes(AdvancedTools.DeepResearch)
      ? deepResearchBootPrompt
      : systemPrompt) + skillsContent

  // The last message should be the new user message to send
  const lastUserMsg = uiMessages.at(-1)
  // All previous messages become the context
  const contextMessages = uiMessages.slice(0, -1)

  // Build SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function sendEvent(event: ChatSseEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Track the ongoing assistant message being built
      let assistantMsgId = uuidV4()
      let currentAssistantMsg: ChatAssistantMessage | null = null

      // Collect tool result messages generated in this turn
      const pendingToolResults: ChatToolResultMessage[] = []

      try {
        // Convert the last user message to an AgentMessage prompt
        const promptMsg: AgentMessage = lastUserMsg
          ? (() => {
              const piMsg = chatMessageToPi(lastUserMsg)
              return piMsg as AgentMessage
            })()
          : {
              role: 'user' as const,
              content: [{ type: 'text' as const, text: '' }],
              timestamp: Date.now()
            }

        const piContextMessages = chatMessagesToPiMessages(contextMessages)

        const agentStream = agentLoop(
          [promptMsg],
          {
            systemPrompt: systemContent,
            messages: piContextMessages,
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

        const finalMessages: ChatMessage[] = [...uiMessages]

        for await (const event of agentStream) {
          if (event.type === 'message_update') {
            // event.message is an AssistantMessage from pi-ai
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
            // Finalize the assistant message
            if (currentAssistantMsg) {
              finalMessages.push(currentAssistantMsg)
            }
            // Reset for next potential message
            assistantMsgId = uuidV4()
            currentAssistantMsg = null
          } else if (event.type === 'tool_execution_start') {
            // Show a shimmering tool-call in current assistant message
            // We send an update with the tool call inline in the current content
            if (currentAssistantMsg) {
              const updatedMsg: ChatAssistantMessage = {
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
              currentAssistantMsg = updatedMsg
              sendEvent({ type: 'message_update', message: updatedMsg })
            }
          } else if (event.type === 'tool_execution_end') {
            // Create a separate ToolResult message
            const toolResultMsg: ChatToolResultMessage = {
              id: uuidV4(),
              role: 'toolResult',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              content: event.result
                ? [
                    {
                      type: 'text' as const,
                      text:
                        typeof event.result === 'string'
                          ? event.result
                          : JSON.stringify(event.result)
                    }
                  ]
                : [],
              details: event.result,
              isError: event.isError,
              timestamp: Date.now()
            }
            pendingToolResults.push(toolResultMsg)
            sendEvent({ type: 'message_update', message: toolResultMsg })
          }
          // agent_end, turn_start, turn_end, message_start, tool_execution_update are ignored
        }

        // Add pending tool results to finalMessages
        for (const tr of pendingToolResults) {
          finalMessages.push(tr)
        }

        // Handle title generation
        if (titlePromise) {
          const title = await titlePromise
          sendEvent({ type: 'title', title })
          updateChatTitleById({ id, title })
        }

        sendEvent({ type: 'done', messages: finalMessages })

        // Persist new/updated messages to DB
        const persisted = await getMessagesByChatId({ id })
        const persistedIds = new Set(persisted.map((m) => m.id))

        const newMessages = finalMessages.filter(
          (m) => !uiMessages.some((um) => um.id === m.id)
        )
        const updatedMessages = finalMessages.filter((m) =>
          persistedIds.has(m.id)
        )

        if (newMessages.length > 0) {
          await saveMessages({
            messages: newMessages.map((m) => {
              if (m.role === 'user') {
                return {
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  usage: null,
                  api: null,
                  provider: null,
                  model: null,
                  stopReason: null,
                  toolCallId: null,
                  toolName: null,
                  isError: null,
                  createdAt: new Date(m.timestamp),
                  chatId: id
                }
              }
              if (m.role === 'assistant') {
                return {
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  usage: m.usage ?? null,
                  api: m.api ?? null,
                  provider: m.provider ?? null,
                  model: m.model ?? null,
                  stopReason: m.stopReason ?? null,
                  toolCallId: null,
                  toolName: null,
                  isError: null,
                  createdAt: new Date(m.timestamp),
                  chatId: id
                }
              }
              // toolResult
              return {
                id: m.id,
                role: m.role,
                content: m.content,
                usage: null,
                api: null,
                provider: null,
                model: null,
                stopReason: null,
                toolCallId: m.toolCallId,
                toolName: m.toolName,
                isError: m.isError,
                createdAt: new Date(m.timestamp),
                chatId: id
              }
            })
          })
        }

        for (const msg of updatedMessages) {
          await updateMessage({ id: msg.id, content: msg.content })
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

chat.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'chat')

  const chatData = await handleDatabaseOperation(
    () => getChatById({ id }),
    'Failed to get chat'
  )

  if (!chatData) {
    throw new ChatSDKError('not_found:chat', `Chat with ID ${id} not found`)
  }

  const messagesFromDb = await handleDatabaseOperation(
    () => getMessagesByChatId({ id }),
    'Failed to get chat messages'
  )

  return successResponse(c, messagesFromDb)
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

export { convertToUIMessages, dbMessageToChatMessage }
export default chat
