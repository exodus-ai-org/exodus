import { createOpenAI } from '@ai-sdk/openai'
import {
  experimental_createMCPClient,
  generateText,
  Message,
  pipeDataStreamToResponse,
  streamText
} from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'
import { Request, Response, Router } from 'express'
import { v4 as uuidV4 } from 'uuid'
import { mcpServerConfigs } from '../../ai/mcp-server'
import {
  getMostRecentUserMessage,
  sanitizeResponseMessages
} from '../../ai/utils'
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages
} from '../../db/queries'

const router = Router()

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
})

export async function connectMcpServers() {
  const transport = new Experimental_StdioMCPTransport({
    command: 'node',
    args: mcpServerConfigs.mcpServers['obsidian-mcp'].args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  const tools = await mcpClient.tools()
  return tools
}

export async function generateTitleFromUserMessage({
  message
}: {
  message: Message
}) {
  const { text: title } = await generateText({
    model: openai('gpt-4o'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message)
  })

  return title
}

router.post('/', async (req: Request, res: Response) => {
  const { id, messages, tools } = req.body
  const userMessage = getMostRecentUserMessage(messages)
  if (!userMessage) {
    res.status(400).send('No user message found')
    return
  }

  const chat = await getChatById({ id })
  if (!chat) {
    const title = await generateTitleFromUserMessage({
      message: userMessage
    })
    await saveChat({ id, title })
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }]
  })

  pipeDataStreamToResponse(res, {
    execute: (dataStream) => {
      const result = streamText({
        model: openai('gpt-4o'),
        system:
          'You are a friendly assistant! Keep your responses concise and helpful.',
        messages,
        maxSteps: 20,
        tools,
        experimental_generateMessageId: uuidV4,
        onFinish: async ({ response, reasoning }) => {
          try {
            const sanitizedResponseMessages = sanitizeResponseMessages({
              messages: response.messages,
              reasoning
            })

            await saveMessages({
              messages: sanitizedResponseMessages.map((message) => {
                return {
                  id: message.id,
                  chatId: id,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date()
                }
              })
            })
          } catch {
            console.error('Failed to save chat')
          }
        }
      })

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true
      })
    },
    onError: (e) => {
      return e instanceof Error ? e.message : 'Oops, an error occured!'
    }
  })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  if (!id) {
    res.status(404).send('Not Found')
  }

  try {
    await deleteChatById({ id })
    res.status(200).send('Chat deleted')
  } catch {
    res.status(500).send('An error occurred while processing your request')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  if (!id) {
    res.status(404).send('Not Found')
  }

  try {
    const chat = await getChatById({ id })
    if (!chat) {
      res.status(404).send('Not Found')
      return
    }

    const messagesFromDb = await getMessagesByChatId({ id })
    res.json(messagesFromDb)
  } catch {
    res.status(500).send('An error occurred while processing your request')
  }
})

export default router
