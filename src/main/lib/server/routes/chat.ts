import { createOpenAI } from '@ai-sdk/openai'
import {
  experimental_createMCPClient,
  generateText,
  Message,
  pipeDataStreamToResponse,
  streamText,
  Tool
} from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { Request, Response, Router } from 'express'
import { v4 as uuidV4 } from 'uuid'
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getSetting,
  saveChat,
  saveMessages
} from '../../db/queries'
import { getMostRecentUserMessage, sanitizeResponseMessages } from '../utils'

const router = Router()

async function getOpenAiInstance() {
  const setting = await getSetting()
  if (!('openaiApiKey' in setting)) {
    return
  }

  return createOpenAI({
    apiKey: setting.openaiApiKey,
    baseURL: setting.openaiBaseUrl
  })
}

async function retrieveTools({ command, args }: StdioConfig) {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  const tools = await mcpClient.tools()
  return tools
}

export async function connectMcpServers(): Promise<Record<
  string,
  Tool
> | null> {
  const setting = await getSetting()

  if ('mcpServers' in setting) {
    const { mcpServers } = setting
    try {
      const mcpServersObj: { mcpServers: { [index: string]: StdioConfig } } =
        JSON.parse(mcpServers)

      const toolsArr = await Promise.all(
        Object.values(mcpServersObj.mcpServers).map((stdioConfig) =>
          retrieveTools(stdioConfig)
        )
      )

      const tools = toolsArr.reduce((acc, obj) => {
        if (typeof obj === 'object' && obj !== null) {
          return { ...acc, ...obj }
        }
        return acc
      }, {})

      return tools
    } catch {
      return null
    }
  } else {
    return null
  }
}

export async function generateTitleFromUserMessage({
  message
}: {
  message: Message
}) {
  const openai = await getOpenAiInstance()
  if (!openai) {
    return ''
  }

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

  const openai = await getOpenAiInstance()
  if (!openai) {
    res.status(500).send('No OpenAI API Key found')
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
