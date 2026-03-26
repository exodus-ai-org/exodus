import type { Model } from '@mariozechner/pi-ai'
import { AiProviders } from '@shared/types/ai'

import { Settings } from '../../db/schema'
import { ChatSDKError } from '../../server/errors'
import { providers } from '../providers'

export const PROVIDER_API_KEY_LABELS: Record<AiProviders, string> = {
  [AiProviders.OpenAiGpt]: 'OpenAI API Key',
  [AiProviders.AnthropicClaude]: 'Anthropic API Key',
  [AiProviders.GoogleGemini]: 'Google Gemini API Key',
  [AiProviders.XaiGrok]: 'xAI API Key',
  [AiProviders.AzureOpenAi]: 'Azure OpenAI API Key',
  [AiProviders.Ollama]: 'Ollama'
}

export function getApiKeyFromSetting(setting: Settings): string {
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

export function getModelFromProvider(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
  apiKey: string
} {
  if (!('id' in setting)) {
    throw new ChatSDKError(
      'not_found:setting',
      'Settings not initialized. Please restart the app.'
    )
  }

  if (!setting.providerConfig?.provider) {
    throw new ChatSDKError(
      'bad_request:setting',
      'No AI provider selected. Please choose a provider in Settings → AI Providers.'
    )
  }

  const providerEnum = setting.providerConfig.provider as AiProviders
  const provider = providers[providerEnum]
  const models = provider(setting)
  const apiKey = getApiKeyFromSetting(setting)

  if (!apiKey) {
    const label = PROVIDER_API_KEY_LABELS[providerEnum] ?? providerEnum
    throw new ChatSDKError(
      'forbidden:setting',
      `${label} is not configured. Please add it in Settings → AI Providers before chatting.`
    )
  }

  return {
    chatModel: models.chatModel,
    reasoningModel: models.reasoningModel,
    apiKey
  }
}
