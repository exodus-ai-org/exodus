import { AdvancedTools } from '@shared/types/ai'
import { ChatMessage } from '@shared/types/chat'
import { Variables } from '@shared/types/server'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText
} from 'ai'
import { Hono } from 'hono'
import { v4 as uuidV4 } from 'uuid'
import { getMcpTools } from '../../ai/mcp'
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import { getActiveSkillsContent } from '../../ai/skills/skills-manager'
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

chat.post('/', async (c) => {
  const { id, message, messages, advancedTools } = validateSchema(
    postRequestBodySchema,
    await c.req.json(),
    'chat',
    'Invalid request body'
  )
  const setting = c.get('setting')
  const { chatModel, reasoningModel } = getModelFromProvider(setting)
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
        message: firstUserMsg,
        model: chatModel
      })
    }
  }

  // AI SDK v6: frontend always sends the full message list; use it directly.
  const uiMessages = messages as ChatMessage[]
  const modelMessages = await convertToModelMessages(uiMessages)
  const [skillsContent, mcpTools] = await Promise.all([
    getActiveSkillsContent(),
    getMcpTools()
  ])

  // immediately start streaming the response
  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer: dataStream }) => {
      const result = streamText({
        model: isReasoningModel ? reasoningModel : chatModel,
        system:
          (advancedTools?.includes(AdvancedTools.DeepResearch)
            ? deepResearchBootPrompt
            : systemPrompt) + skillsContent,
        messages: modelMessages,
        stopWhen: stepCountIs(setting.providerConfig?.maxSteps ?? 20),
        tools: bindCallingTools({ advancedTools, setting, mcpTools }),
        experimental_activeTools: isReasoningModel ? [] : ['weather'],
        providerOptions: isReasoningModel
          ? {
              anthropic: {
                thinking: { type: 'enabled', budgetTokens: 10_000 }
              }
            }
          : undefined
      })

      dataStream.merge(result.toUIMessageStream({ sendReasoning: true }))

      if (titlePromise) {
        const title = await titlePromise
        dataStream.write({ type: 'data-chat-title', data: title })
        updateChatTitleById({ id, title })
      }
    },
    generateId: uuidV4,
    onFinish: async ({ messages: finishedMessages }) => {
      if (finishedMessages.length === 0) return

      // Diff against DB: insert new messages, update existing ones (tool results).
      const persisted = await getMessagesByChatId({ id })
      const persistedIds = new Set(persisted.map((m) => m.id))

      const toInsert = finishedMessages.filter((m) => !persistedIds.has(m.id))
      const toUpdate = finishedMessages.filter((m) => persistedIds.has(m.id))

      if (toInsert.length > 0) {
        await saveMessages({
          messages: toInsert.map((m) => ({
            id: m.id,
            role: m.role,
            parts: m.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id
          }))
        })
      }

      for (const msg of toUpdate) {
        await updateMessage({ id: msg.id, parts: msg.parts })
      }
    },
    onError: (error) => {
      console.log(error)
      // Error messages are masked by default for security reasons.
      // If you want to expose the error message to the client, you can do so here:
      return error instanceof Error ? error.message : String(error)
    }
  })

  return createUIMessageStreamResponse({ stream })
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

  const chat = await handleDatabaseOperation(
    () => getChatById({ id }),
    'Failed to get chat'
  )

  if (!chat) {
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

export default chat
