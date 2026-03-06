import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModel } from 'ai'

export function getAnthropicClaude(setting: Setting): {
  provider: AnthropicProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
} {
  const anthropic = createAnthropic({
    apiKey: setting.providers?.anthropicApiKey ?? '',
    baseURL: setting.providers?.anthropicBaseUrl || undefined
  })

  return {
    provider: anthropic,
    chatModel: anthropic(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: anthropic(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: anthropic.embeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
