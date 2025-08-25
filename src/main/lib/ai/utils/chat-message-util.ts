import type { LanguageModelV2 } from '@ai-sdk/provider'
import { AdvancedTools, McpTools, Providers } from '@shared/types/ai'
import {
  AssistantModelMessage,
  ToolModelMessage,
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
  rag,
  weather,
  webSearch
} from '../calling-tools'
import { titleGenerationPrompt } from '../prompts'
import { providers } from '../providers'

type ResponseMessageWithoutId = AssistantModelMessage | ToolModelMessage
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
  model: LanguageModelV2
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
  mcpTools: McpTools[]
  advancedTools: AdvancedTools[]
  settings: Settings
}): ToolSet {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return {
      deepResearch
    }
  }

  const mcpToolsMap = mcpTools
    .map((mcpTool) => mcpTool.tools)
    .reduce((acc, obj) => {
      if (typeof obj === 'object' && obj !== null) {
        return { ...acc, ...obj }
      }
      return acc
    }, {})

  const tools = {
    ...mcpToolsMap,
    rag,
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
