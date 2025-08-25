import { AdvancedTools } from '@shared/types/ai'
import { Variables } from '@shared/types/server'
import { convertToUIMessages } from '@shared/utils/ai'
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  stepCountIs,
  streamText
} from 'ai'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { v4 as uuidV4 } from 'uuid'
import { deepResearchBootPrompt, systemPrompt } from '../../ai/prompts'
import {
  bindCallingTools,
  generateTitleFromUserMessage,
  getModelFromProvider,
  getMostRecentUserMessage
} from '../../ai/utils/chat-message-util'
import {
  deleteChatById,
  fullTextSearchOnMessages,
  getChatById,
  getMessagesByChatId,
  getSettings,
  saveChat,
  saveMessages,
  updateChat
} from '../../db/queries'
import { createChatSchema, updateChatSchema } from '../schemas'

const chat = new Hono<{ Variables: Variables }>()

chat.get('/mcp', async (c) => {
  const tools = c.get('tools')
  return c.json({ tools })
})

chat.get('/search', async (c) => {
  const query = c.req.query('query')

  try {
    const result = await fullTextSearchOnMessages(query ?? '')
    return c.json(result)
  } catch {
    return c.text('An error occurred while processing your request', 500)
  }
})

chat.post('/', async (c) => {
  const body = createChatSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.text('Invalid request body', 400)
  }
  const { id, messages, advancedTools } = body.data
  const mcpTools = c.get('tools')

  const settings = await getSettings()
  if (!('id' in settings)) {
    throw new Error('Failed to retrieve settings.')
  }

  if (!settings.providerConfig?.chatModel) {
    throw new Error('Failed to retrieve selected chat model.')
  }

  if (!settings.providerConfig?.reasoningModel) {
    throw new Error('Failed to retrieve selected reasoning model.')
  }

  const userMessage = getMostRecentUserMessage(messages)
  if (!userMessage) {
    return c.text('No user message found', 400)
  }

  const { chatModel, reasoningModel } = await getModelFromProvider()

  const existingChat = await getChatById({ id })
  if (!existingChat) {
    const title = await generateTitleFromUserMessage({
      model: chatModel,
      message: userMessage
    })
    await saveChat({ id, title })
  }

  const messagesFromDb = await getMessagesByChatId({ id })
  const uiMessages = [...convertToUIMessages(messagesFromDb), userMessage]

  await saveMessages({
    messages: [
      {
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: userMessage.parts,
        attachments: [],
        createdAt: new Date()
      }
    ]
  })

  const dataStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model:
          advancedTools.includes(AdvancedTools.Reasoning) ||
          advancedTools.includes(AdvancedTools.DeepResearch)
            ? reasoningModel
            : chatModel,
        system: advancedTools.includes(AdvancedTools.DeepResearch)
          ? deepResearchBootPrompt
          : systemPrompt,
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(settings.providerConfig?.maxSteps ?? 1),
        tools: bindCallingTools({ mcpTools, advancedTools, settings })
      })

      writer.merge(result.toUIMessageStream())
    },
    generateId: uuidV4,
    onFinish: async ({ messages }) => {
      await saveMessages({
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          createdAt: new Date(),
          attachments: [],
          chatId: id
        }))
      })
    },
    onError: (error) => {
      // Error messages are masked by default for security reasons.
      // If you want to expose the error message to the client, you can do so here:
      return error instanceof Error ? error.message : String(error)
    }
  })

  // Mark the response as a v2 data stream:
  c.header('content-type', 'text/event-stream')
  c.header('cache-control', 'no-cache')
  c.header('connection', 'keep-alive')
  c.header('x-vercel-ai-data-stream', 'v2')
  c.header('x-accel-buffering', 'no') // disable nginx buffering

  return stream(c, (stream) =>
    stream.pipe(
      dataStream
        .pipeThrough(new JsonToSseTransformStream())
        .pipeThrough(new TextEncoderStream())
    )
  )
})

chat.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.text('Not Found', 404)
  }

  try {
    await deleteChatById({ id })
    return c.text('Chat deleted', 200)
  } catch {
    return c.text('An error occurred while processing your request', 500)
  }
})

chat.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.text('Not Found', 404)
  }

  try {
    const chat = await getChatById({ id })
    if (!chat) {
      return c.text('Not Found', 404)
    }

    const messagesFromDb = await getMessagesByChatId({ id })
    return c.json(messagesFromDb)
  } catch {
    return c.text('An error occurred while processing your request', 500)
  }
})

chat.put('/', async (c) => {
  const result = updateChatSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.text('Invalid request body', 400)
  }
  const payload = result.data

  if (!payload.id) {
    return c.text('Not Found', 404)
  }

  try {
    await updateChat(payload)
    return c.text(`Succeed to update chat ${payload.id}}`, 200)
  } catch {
    return c.text('An error occurred while processing your request', 500)
  }
})

export default chat
