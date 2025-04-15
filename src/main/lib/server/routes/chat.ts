import { AdvancedTools, Providers, Variables } from '@shared/types/ai'
import {
  appendResponseMessages,
  CoreAssistantMessage,
  CoreToolMessage,
  createDataStream,
  experimental_createMCPClient,
  generateText,
  LanguageModelV1,
  Message,
  streamText,
  Tool,
  UIMessage
} from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { v4 as uuidV4 } from 'uuid'
import { providers } from '../../ai/providers'
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getSetting,
  saveChat,
  saveMessages
} from '../../db/queries'

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage
type ResponseMessage = ResponseMessageWithoutId & { id: string }

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user')
  return userMessages.at(-1)
}

export function getTrailingMessageId({
  messages
}: {
  messages: Array<ResponseMessage>
}): string | null {
  const trailingMessage = messages.at(-1)

  if (!trailingMessage) return null

  return trailingMessage.id
}

const chat = new Hono<{ Variables: Variables }>()

async function getModelFromProvider() {
  const setting = await getSetting()
  if (!('id' in setting)) {
    throw new Error('Failed to retrieve settings.')
  }

  if (!setting.provider) {
    throw new Error('Failed to retrieve selected provider.')
  }

  const provider = providers[setting.provider as Providers]
  const models = provider(setting)

  return models
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
    if (mcpServers === null) return null

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
  model,
  message
}: {
  model: LanguageModelV1
  message: Message
}) {
  const { text: title } = await generateText({
    model,
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
  const { id, messages, advancedTools } = await c.req.json<{
    id: string
    messages: UIMessage[]
    advancedTools: AdvancedTools[]
  }>()
  const tools = c.get('tools')

  const setting = await getSetting()
  if (!('id' in setting)) {
    throw new Error('Failed to retrieve settings.')
  }

  if (!setting.chatModel) {
    throw new Error('Failed to retrieve selected chat model.')
  }

  if (!setting.reasoningModel) {
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
        model: advancedTools.includes(AdvancedTools.Reasoning)
          ? reasoningModel
          : chatModel,
        system:
          'You are a friendly assistant! Keep your responses concise and helpful.',
        messages,
        maxSteps: setting.maxSteps ?? 1,
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
          } catch {
            console.error('Failed to save chat')
          }
        }
      })

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
        sendSources: true,
        sendUsage: true
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
