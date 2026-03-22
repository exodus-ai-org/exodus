import type { AgentTool } from '@mariozechner/pi-agent-core'
import type { Model, TextContent } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { AdvancedTools, AiProviders, McpTools } from '@shared/types/ai'
import type { ChatMessage } from '@shared/types/chat'

import { Setting } from '../../db/schema'
import {
  deepResearch,
  editFile,
  findFiles,
  googleMapsPlaces,
  googleMapsRouting,
  grep,
  imageGeneration,
  lcmDescribe,
  lcmExpand,
  lcmGrep,
  listDirectory,
  readFile,
  terminal,
  weather,
  webFetch,
  webSearch,
  writeFile
} from '../calling-tools'
import { titleGenerationPrompt } from '../prompts'
import { providers } from '../providers'

/**
 * Type-erased AgentTool for heterogeneous collections.
 * AgentTool<T> is contravariant on T, so typed tools can't go into AgentTool[].
 * This mirrors pi-agent-core's own default: AgentTool<TSchema, any>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErasedTool = AgentTool<any>

const PROVIDER_API_KEY_LABELS: Record<AiProviders, string> = {
  [AiProviders.OpenAiGpt]: 'OpenAI API Key',
  [AiProviders.AnthropicClaude]: 'Anthropic API Key',
  [AiProviders.GoogleGemini]: 'Google Gemini API Key',
  [AiProviders.XaiGrok]: 'xAI API Key',
  [AiProviders.AzureOpenAi]: 'Azure OpenAI API Key',
  [AiProviders.Ollama]: 'Ollama'
}

function getApiKeyFromSetting(setting: Setting): string {
  const provider = setting.providerConfig?.provider as AiProviders | undefined
  if (!provider) return ''

  switch (provider) {
    case AiProviders.OpenAiGpt:
      return setting.providers?.openaiApiKey ?? ''
    case AiProviders.AnthropicClaude:
      return setting.providers?.anthropicApiKey ?? ''
    case AiProviders.GoogleGemini:
      return setting.providers?.googleGeminiApiKey ?? ''
    case AiProviders.XaiGrok:
      return setting.providers?.xAiApiKey ?? ''
    case AiProviders.AzureOpenAi:
      return setting.providers?.azureOpenaiApiKey ?? ''
    case AiProviders.Ollama:
      return 'ollama'
    default:
      return ''
  }
}

export function getModelFromProvider(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
  apiKey: string
} {
  if (!('id' in setting)) {
    throw new Error('Failed to retrieve setting.')
  }

  if (!setting.providerConfig?.provider) {
    throw new Error('Failed to retrieve selected provider.')
  }

  const providerEnum = setting.providerConfig.provider as AiProviders
  const provider = providers[providerEnum]
  const models = provider(setting)
  const apiKey = getApiKeyFromSetting(setting)

  if (!apiKey) {
    const label = PROVIDER_API_KEY_LABELS[providerEnum] ?? providerEnum
    throw new Error(
      `${label} is not configured. Please add it in Settings → Providers before chatting.`
    )
  }

  return {
    chatModel: models.chatModel,
    reasoningModel: models.reasoningModel,
    apiKey
  }
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((c): c is TextContent => c.type === 'text')
    .map((c) => c.text)
    .join('')
}

export function getTextFromMessage(message: ChatMessage): string {
  if (message.role === 'user') {
    if (typeof message.content === 'string') return message.content
    return extractText(message.content)
  }
  return extractText(message.content)
}

export async function generateTitleFromUserMessage({
  message,
  model,
  apiKey
}: {
  message: ChatMessage
  model: Model<string>
  apiKey: string
}) {
  const userText = getTextFromMessage(message)
  const result = await completeSimple(
    model,
    {
      systemPrompt: titleGenerationPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userText }],
          timestamp: Date.now()
        }
      ]
    },
    { apiKey }
  )

  const text = extractText(result.content)

  return text
    .replace(/^[#*"\s]+/, '')
    .replace(/["]+$/, '')
    .trim()
}

export function bindCallingTools({
  advancedTools,
  setting,
  chatModel,
  apiKey,
  mcpTools = []
}: {
  advancedTools: AdvancedTools[]
  setting: Setting
  chatModel?: Model<string>
  apiKey?: string
  mcpTools?: McpTools[]
}): ErasedTool[] {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return [deepResearch]
  }

  const mcpToolsList: ErasedTool[] = mcpTools.flatMap((t) => t.tools)

  const disabledTools = new Set(setting.tools?.disabledTools ?? [])
  const enabled = (key: string) => !disabledTools.has(key)

  const tools: ErasedTool[] = []

  if (enabled('weather')) tools.push(weather)
  if (enabled('googleMapsPlaces')) tools.push(googleMapsPlaces(setting))
  if (enabled('googleMapsRouting')) tools.push(googleMapsRouting(setting))
  if (enabled('imageGeneration')) tools.push(imageGeneration(setting))
  if (enabled('terminal')) tools.push(terminal)
  if (enabled('readFile')) tools.push(readFile)
  if (enabled('writeFile')) tools.push(writeFile)
  if (enabled('editFile')) tools.push(editFile)
  if (enabled('listDirectory')) tools.push(listDirectory)
  if (enabled('findFiles')) tools.push(findFiles)
  if (enabled('grep')) tools.push(grep)
  if (enabled('webFetch')) tools.push(webFetch(setting))

  if (advancedTools.includes(AdvancedTools.WebSearch) && enabled('webSearch')) {
    tools.push(webSearch(setting))
  }

  // LCM recall tools: available when LCM is enabled
  const lcmEnabled = setting.memoryLayer?.lcmEnabled !== false
  if (lcmEnabled) {
    tools.push(lcmGrep)
    tools.push(lcmDescribe)
    if (chatModel && apiKey) {
      tools.push(lcmExpand(chatModel, apiKey))
    }
  }

  return [...mcpToolsList, ...tools]
}
