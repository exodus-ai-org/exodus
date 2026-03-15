import type { AgentMessage } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import { AdvancedTools } from '@shared/types/ai'
import { ChatMessage, ChatSseEvent, MessagePart } from '@shared/types/chat'
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

// Convert ChatMessage[] to pi-ai Message[] (only user & assistant messages)
function chatMessagesToPiMessages(messages: ChatMessage[]): Message[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      if (m.role === 'user') {
        return {
          role: 'user' as const,
          content: m.parts
            .filter((p) => p.type === 'text' || p.type === 'file')
            .map((p) => {
              if (p.type === 'text') {
                return { type: 'text' as const, text: p.text }
              }
              // file → image
              return {
                type: 'image' as const,
                data: p.url,
                mimeType: p.mediaType ?? 'image/png'
              }
            }),
          timestamp: new Date(m.createdAt ?? Date.now()).getTime()
        }
      }
      // assistant
      return {
        role: 'assistant' as const,
        content: m.parts
          .filter((p) => p.type === 'text' || p.type === 'thinking')
          .map((p) => {
            if (p.type === 'thinking') {
              return {
                type: 'thinking' as const,
                thinking: p.text,
                thinkingSignature: ''
              }
            }
            return {
              type: 'text' as const,
              text: (p as { type: 'text'; text: string }).text
            }
          }),
        api: 'openai-completions' as const,
        provider: 'openai' as const,
        model: '',
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        },
        stopReason: 'stop' as const,
        timestamp: new Date(m.createdAt ?? Date.now()).getTime()
      }
    })
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
      let assistantParts: MessagePart[] = []

      try {
        // Convert the last user message to an AgentMessage prompt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const promptMsg: AgentMessage = lastUserMsg
          ? {
              role: 'user' as const,
              content: lastUserMsg.parts
                .filter((p) => p.type === 'text' || p.type === 'file')
                .map((p) => {
                  if (p.type === 'text') {
                    return { type: 'text' as const, text: p.text }
                  }
                  return {
                    type: 'image' as const,
                    data: p.url,
                    mimeType: p.mediaType ?? 'image/png'
                  }
                }),
              timestamp: Date.now()
            }
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
              // AgentMessages are already pi-ai Messages in our case
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
            // event.message is an AgentMessage (AssistantMessage here)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msg = event.message as any
            assistantParts = []

            if (Array.isArray(msg.content)) {
              for (const part of msg.content) {
                if (part.type === 'text') {
                  assistantParts.push({ type: 'text', text: part.text })
                } else if (part.type === 'thinking') {
                  assistantParts.push({
                    type: 'thinking',
                    text: part.thinking ?? ''
                  })
                }
              }
            }

            const currentMsg: ChatMessage = {
              id: assistantMsgId,
              role: 'assistant',
              parts: assistantParts,
              createdAt: new Date().toISOString()
            }
            sendEvent({ type: 'message_update', message: currentMsg })
          } else if (event.type === 'message_end') {
            // Finalize the assistant message
            const currentMsg: ChatMessage = {
              id: assistantMsgId,
              role: 'assistant',
              parts: assistantParts,
              createdAt: new Date().toISOString()
            }
            finalMessages.push(currentMsg)
            // Reset for next potential message
            assistantMsgId = uuidV4()
            assistantParts = []
          } else if (event.type === 'tool_execution_start') {
            // Update current assistant message to include tool-call part
            const toolCallPart: MessagePart = {
              type: 'tool-call',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args as Record<string, unknown>,
              state: 'running'
            }
            assistantParts = [...assistantParts, toolCallPart]
            const currentMsg: ChatMessage = {
              id: assistantMsgId,
              role: 'assistant',
              parts: assistantParts,
              createdAt: new Date().toISOString()
            }
            sendEvent({ type: 'message_update', message: currentMsg })
            sendEvent({
              type: 'tool_start',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args
            })
          } else if (event.type === 'tool_execution_end') {
            // Update tool-call part to done
            assistantParts = assistantParts.map((p) => {
              if (p.type === 'tool-call' && p.toolCallId === event.toolCallId) {
                return {
                  ...p,
                  state: 'done' as const,
                  result: event.result
                }
              }
              return p
            })
            const currentMsg: ChatMessage = {
              id: assistantMsgId,
              role: 'assistant',
              parts: assistantParts,
              createdAt: new Date().toISOString()
            }
            sendEvent({ type: 'message_update', message: currentMsg })
            sendEvent({
              type: 'tool_end',
              toolCallId: event.toolCallId,
              result: event.result,
              isError: event.isError
            })
          }
          // agent_end, turn_start, turn_end, message_start, tool_execution_update are ignored
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
            messages: newMessages.map((m) => ({
              id: m.id,
              role: m.role,
              parts: m.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id
            }))
          })
        }

        for (const msg of updatedMessages) {
          await updateMessage({ id: msg.id, parts: msg.parts })
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

export { convertToUIMessages }
export default chat
