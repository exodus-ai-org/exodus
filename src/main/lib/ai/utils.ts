import { Providers } from '@shared/types/ai'
import {
  CoreAssistantMessage,
  CoreToolMessage,
  LanguageModelV1,
  UIMessage,
  generateText
} from 'ai'
import { getSettings } from '../db/queries'
import { TITLE_GENERATION_PROMPT } from './prompts'
import { providers } from './providers'

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage
type ResponseMessage = ResponseMessageWithoutId & { id: string }

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
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

export async function getModelFromProvider() {
  const settings = await getSettings()
  if (!('id' in settings)) {
    throw new Error('Failed to retrieve settings.')
  }

  if (!settings.providerConfig?.provider) {
    throw new Error('Failed to retrieve selected provider.')
  }

  const provider = providers[settings.providerConfig?.provider as Providers]
  const models = provider(settings)

  return models
}

export async function generateTitleFromUserMessage({
  model,
  message
}: {
  model: LanguageModelV1
  message: UIMessage
}) {
  const { text: title } = await generateText({
    model,
    system: TITLE_GENERATION_PROMPT,
    prompt: JSON.stringify(message)
  })

  return title
}
