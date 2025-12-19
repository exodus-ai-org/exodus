import { AdvancedTools, AiProviders, McpTools } from '@shared/types/ai'
import {
  CoreAssistantMessage,
  CoreToolMessage,
  LanguageModelV1,
  ToolSet,
  UIMessage,
  generateText
} from 'ai'
import { getSettings } from '../../db/queries'
import { Setting } from '../../db/schema'
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
  const setting = await getSettings()
  if (!('id' in setting)) {
    throw new Error('Failed to retrieve setting.')
  }

  if (!setting.providerConfig?.provider) {
    throw new Error('Failed to retrieve selected provider.')
  }

  const provider = providers[setting.providerConfig?.provider as AiProviders]
  const models = provider(setting)

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
  setting
}: {
  mcpTools: McpTools[]
  advancedTools: AdvancedTools[]
  setting: Setting
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
    googleMapsPlaces: googleMapsPlaces(setting),
    googleMapsRouting: googleMapsRouting(setting),
    imageGeneration: imageGeneration(setting)
  }
  if (advancedTools.includes(AdvancedTools.WebSearch)) {
    tools['webSearch'] = webSearch(setting)
  }

  return tools
}
