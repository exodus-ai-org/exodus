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
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
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
import { DBMessage } from '../../db/schema'
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
  const tools = c.get('tools')
  return successResponse(c, { tools })
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
  const mcpTools = c.get('tools')
  const setting = c.get('setting')
  const { chatModel, reasoningModel } = getModelFromProvider(setting)
  const isToolApprovalFlow = Boolean(messages)
  const isReasoningModel =
    advancedTools?.includes(AdvancedTools.Reasoning) ||
    advancedTools?.includes(AdvancedTools.DeepResearch)

  const chat = await getChatById({ id })
  let messagesFromDb: DBMessage[] = []
  let titlePromise: Promise<string> | null = null

  if (chat) {
    if (!isToolApprovalFlow) {
      messagesFromDb = await getMessagesByChatId({ id })
    }
  } else if (message?.role === 'user') {
    await saveChat({
      id,
      title: 'New chat'
    })
    titlePromise = generateTitleFromUserMessage({ message, model: chatModel })
  }

  const uiMessages = isToolApprovalFlow
    ? (messages as ChatMessage[])
    : [...convertToUIMessages(messagesFromDb), message as ChatMessage]

  const modelMessages = await convertToModelMessages(uiMessages)

  // immediately start streaming the response
  const stream = createUIMessageStream({
    originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    execute: async ({ writer: dataStream }) => {
      const result = streamText({
        model: isReasoningModel ? reasoningModel : chatModel,
        system: advancedTools?.includes(AdvancedTools.DeepResearch)
          ? deepResearchBootPrompt
          : systemPrompt,
        messages: modelMessages,
        stopWhen: stepCountIs(setting.providerConfig?.maxSteps ?? 1),
        tools: bindCallingTools({ mcpTools, advancedTools, setting }),
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
      if (isToolApprovalFlow) {
        for (const finishedMsg of finishedMessages) {
          const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id)
          if (existingMsg) {
            await updateMessage({
              id: finishedMsg.id,
              parts: finishedMsg.parts
            })
          } else {
            await saveMessages({
              messages: [
                {
                  id: finishedMsg.id,
                  role: finishedMsg.role,
                  parts: finishedMsg.parts,
                  createdAt: new Date(),
                  attachments: [],
                  chatId: id
                }
              ]
            })
          }
        }
      } else if (finishedMessages.length > 0) {
        await saveMessages({
          messages: finishedMessages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id
          }))
        })
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
