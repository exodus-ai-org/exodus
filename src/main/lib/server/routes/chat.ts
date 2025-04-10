import { createOpenAI } from '@ai-sdk/openai'
import {
  appendResponseMessages,
  createDataStream,
  experimental_createMCPClient,
  generateText,
  Message,
  streamText,
  Tool
} from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { v4 as uuidV4 } from 'uuid'
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getSetting,
  saveChat,
  saveMessages
} from '../../db/queries'
import { Variables } from '../types'
import { getMostRecentUserMessage, getTrailingMessageId } from '../utils'

const chat = new Hono<{ Variables: Variables }>()

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

chat.post('/', async (c) => {
  const { id, messages } = await c.req.json()
  const tools = c.get('tools')

  const userMessage = getMostRecentUserMessage(messages)
  if (!userMessage) {
    return c.text('No user message found', 400)
  }

  const openai = await getOpenAiInstance()
  if (!openai) {
    return c.text('No OpenAI API Key found', 500)
  }

  const existingChat = await getChatById({ id })
  if (!existingChat) {
    const title = await generateTitleFromUserMessage({
      message: userMessage
    })
    await saveChat({ id, title })
  }

  await saveMessages({
    messages: [
      {
        ...userMessage,
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: userMessage.parts,
        attachments: userMessage.experimental_attachments ?? [],
        createdAt: new Date()
      }
    ]
  })

  // immediately start streaming the response
  const dataStream = createDataStream({
    execute: async (dataStream) => {
      const result = streamText({
        model: openai('gpt-4o'),
        system:
          'You are a friendly assistant! Keep your responses concise and helpful.',
        messages,
        maxSteps: 20,
        tools,
        experimental_generateMessageId: uuidV4,
        onFinish: async ({ response }) => {
          try {
            const assistantId = getTrailingMessageId({
              messages: response.messages.filter(
                (message) => message.role === 'assistant'
              )
            })

            if (!assistantId) {
              throw new Error('No assistant message found!')
            }

            const [, assistantMessage] = appendResponseMessages({
              messages: [userMessage],
              responseMessages: response.messages
            })

            await saveMessages({
              messages: [
                {
                  id: assistantId,
                  chatId: id,
                  role: assistantMessage.role,
                  parts: assistantMessage.parts,
                  attachments: assistantMessage.experimental_attachments ?? [],
                  createdAt: new Date()
                }
              ]
            })

            result.consumeStream()

            result.mergeIntoDataStream(dataStream, {
              sendReasoning: true
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
    onError: (error) => {
      // Error messages are masked by default for security reasons.
      // If you want to expose the error message to the client, you can do so here:
      return error instanceof Error ? error.message : String(error)
    }
  })

  // Mark the response as a v1 data stream:
  c.header('X-Vercel-AI-Data-Stream', 'v1')
  c.header('Content-Type', 'text/plain; charset=utf-8')

  return stream(c, (stream) =>
    stream.pipe(dataStream.pipeThrough(new TextEncoderStream()))
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

export default chat
