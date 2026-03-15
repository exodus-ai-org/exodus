import type { AgentTool } from '@mariozechner/pi-agent-core'
import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { AdvancedTools, AiProviders, McpTools } from '@shared/types/ai'
import type { ChatAssistantMessage, ChatMessage } from '@shared/types/chat'
import { dbMessageToChatMessage } from '../../db/queries'
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
import type { EmbeddingConfig } from '../providers'
import { providers } from '../providers'

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
  embeddingConfig: EmbeddingConfig | null
} {
  if (!('id' in setting)) {
    throw new Error('Failed to retrieve setting.')
  }

  if (!setting.providerConfig?.provider) {
    throw new Error('Failed to retrieve selected provider.')
  }

  const provider = providers[setting.providerConfig.provider as AiProviders]
  const models = provider(setting)
  const apiKey = getApiKeyFromSetting(setting)

  return {
    chatModel: models.chatModel,
    reasoningModel: models.reasoningModel,
    apiKey,
    embeddingConfig: models.embeddingConfig
  }
}

export function getTextFromMessage(message: ChatMessage): string {
  if (message.role === 'user') {
    if (typeof message.content === 'string') return message.content
    return message.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
  }
  if (message.role === 'assistant') {
    return message.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
  }
  // toolResult
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('')
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map(dbMessageToChatMessage)
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

  const text = result.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('')

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): AgentTool<any>[] {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return [deepResearch]
  }

  // Flatten MCP tools from all servers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mcpToolsList: AgentTool<any>[] = mcpTools.flatMap((t) => t.tools)

  const disabledTools = new Set(setting.tools?.disabledTools ?? [])
  const enabled = (key: string) => !disabledTools.has(key)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: AgentTool<any>[] = []

  if (enabled('rag')) tools.push(rag(setting))
  if (enabled('calculator')) tools.push(calculator)
  if (enabled('date')) tools.push(date)
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
  if (enabled('webFetch')) tools.push(webFetch)

  if (advancedTools.includes(AdvancedTools.WebSearch) && enabled('webSearch')) {
    tools.push(webSearch(setting))
  }

  return [...mcpToolsList, ...tools]
}

// Unused export kept for backwards compat with chat route re-export
export type { ChatAssistantMessage }
