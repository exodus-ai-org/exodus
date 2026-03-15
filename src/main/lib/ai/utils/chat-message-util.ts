import { AdvancedTools, AiProviders, McpTools } from '@shared/types/ai'
import { ChatMessage, ChatTools, CustomUIDataTypes } from '@shared/types/chat'
import {
  AssistantModelMessage,
  LanguageModel,
  ToolModelMessage,
  ToolSet,
  UIMessage,
  UIMessagePart,
  generateText
} from 'ai'
import { formatISO } from 'date-fns'
import { DBMessage, Setting } from '../../db/schema'
import {
  calculator,
  date,
  deepResearch,
  editFile,
  findFiles,
  googleMapsPlaces,
  googleMapsRouting,
  grep,
  imageGeneration,
  listDirectory,
  rag,
  readFile,
  terminal,
  weather,
  webFetch,
  webSearch,
  writeFile
} from '../calling-tools'
import { titleGenerationPrompt } from '../prompts'
import { providers } from '../providers'

type ResponseMessageWithoutId = ToolModelMessage | AssistantModelMessage
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

export function getModelFromProvider(setting: Setting) {
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

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join('')
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt)
    }
  }))
}

export async function generateTitleFromUserMessage({
  message,
  model
}: {
  message: UIMessage
  model: LanguageModel
}) {
  const { text } = await generateText({
    model,
    system: titleGenerationPrompt,
    prompt: getTextFromMessage(message)
  })
  return text
    .replace(/^[#*"\s]+/, '')
    .replace(/["]+$/, '')
    .trim()
}

export function bindCallingTools({
  advancedTools,
  setting,
  mcpTools = []
}: {
  advancedTools: AdvancedTools[]
  setting: Setting
  mcpTools?: McpTools[]
}): ToolSet {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return {
      deepResearch
    }
  }

  const mcpToolsMap = mcpTools
    .map((t) => t.tools)
    .reduce((acc, tools) => ({ ...acc, ...tools }), {})

  const disabledTools = new Set(setting.tools?.disabledTools ?? [])
  const enabled = (key: string) => !disabledTools.has(key)

  const tools: ToolSet = {}
  if (enabled('rag')) tools.rag = rag(setting)
  if (enabled('calculator')) tools.calculator = calculator
  if (enabled('date')) tools.date = date
  if (enabled('weather')) tools.weather = weather
  if (enabled('googleMapsPlaces'))
    tools.googleMapsPlaces = googleMapsPlaces(setting)
  if (enabled('googleMapsRouting'))
    tools.googleMapsRouting = googleMapsRouting(setting)
  if (enabled('imageGeneration'))
    tools.imageGeneration = imageGeneration(setting)
  if (enabled('terminal')) tools.terminal = terminal
  if (enabled('readFile')) tools.readFile = readFile
  if (enabled('writeFile')) tools.writeFile = writeFile
  if (enabled('editFile')) tools.editFile = editFile
  if (enabled('listDirectory')) tools.listDirectory = listDirectory
  if (enabled('findFiles')) tools.findFiles = findFiles
  if (enabled('grep')) tools.grep = grep
  if (enabled('webFetch')) tools.webFetch = webFetch

  if (advancedTools.includes(AdvancedTools.WebSearch) && enabled('webSearch')) {
    tools.webSearch = webSearch(setting)
  }

  return { ...mcpToolsMap, ...tools }
}
