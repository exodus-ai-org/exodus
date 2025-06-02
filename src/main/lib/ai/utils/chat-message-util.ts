import { AdvancedTools, Providers } from '@shared/types/ai'
import {
  CoreAssistantMessage,
  CoreToolMessage,
  LanguageModelV1,
  Tool,
  ToolSet,
  UIMessage,
  generateText
} from 'ai'
import { getSettings } from '../../db/queries'
import { Settings } from '../../db/schema'
import {
  calculator,
  date,
  deepResearch,
  googleMapsPlaces,
  googleMapsRouting,
  imageGeneration,
  weather,
  webSearch
} from '../calling-tools'
import { titleGenerationPrompt } from '../prompts'
import { providers } from '../providers'

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
    system: titleGenerationPrompt,
    prompt: JSON.stringify(message)
  })

  return title
}

export function bindCallingTools({
  mcpTools,
  advancedTools,
  settings
}: {
  mcpTools: Record<string, Tool>
  advancedTools: AdvancedTools[]
  settings: Settings
}): ToolSet {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return {
      deepResearch
    }
  }

  const tools = {
    ...mcpTools,
    calculator,
    date,
    weather,
    googleMapsPlaces: googleMapsPlaces(settings),
    googleMapsRouting: googleMapsRouting(settings),
    imageGeneration: imageGeneration(settings)
  }
  if (advancedTools.includes(AdvancedTools.WebSearch)) {
    tools['webSearch'] = webSearch(settings)
  }

  return tools
}
