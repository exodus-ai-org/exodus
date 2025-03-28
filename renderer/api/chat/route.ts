import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages
} from '@/lib/db/queries'
import { Setting } from '@/lib/db/schema'
import { getMostRecentUserMessage, sanitizeResponseMessages } from '@/lib/utils'
import { createOpenAI } from '@ai-sdk/openai'
import {
  createDataStreamResponse,
  generateText,
  streamText,
  type Message
} from 'ai'
import { v4 as uuidV4 } from 'uuid'

export async function generateTitleFromUserMessage({
  message,
  setting
}: {
  setting: Setting
  message: Message
}) {
  const openai = createOpenAI({
    apiKey: setting.openaiApiKey,
    baseURL: setting.openaiBaseUrl
  })

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

export const maxDuration = 60

export async function POST(request: Request) {
  const {
    id,
    setting,
    messages
  }: { id: string; messages: Array<Message>; setting: Setting } =
    await request.json()

  const userMessage = getMostRecentUserMessage(messages)

  if (!userMessage) {
    return new Response('No user message found', { status: 400 })
  }
  const chat = await getChatById({ id })
  if (!chat) {
    const title = await generateTitleFromUserMessage({
      message: userMessage,
      setting
    })
    await saveChat({ id, title })
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }]
  })

  const openai = createOpenAI({
    apiKey: setting.openaiApiKey,
    baseURL: setting.openaiBaseUrl
  })

  // const gemini = createGoogleGenerativeAI({
  //   apiKey: setting.googleApiKey
  // })

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        // model: gemini('gemini-2.0-flash-001'),
        model: openai('gpt-4o'),
        system:
          'You are a friendly assistant! Keep your responses concise and helpful.',
        messages,
        maxSteps: 20,
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
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new Response('Not Found', { status: 404 })
  }

  try {
    await deleteChatById({ id })

    return new Response('Chat deleted', { status: 200 })
  } catch {
    return new Response('An error occurred while processing your request', {
      status: 500
    })
  }
}
