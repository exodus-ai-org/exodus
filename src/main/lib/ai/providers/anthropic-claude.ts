import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getAnthropicClaude(setting: Setting): {
  provider: AnthropicProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const anthropic = createAnthropic({
    apiKey: setting.providers?.anthropicApiKey ?? '',
    baseURL: setting.providers?.anthropicBaseUrl || undefined
  })

  return {
    provider: anthropic,
    chatModel: anthropic(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: anthropic(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: anthropic.textEmbeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
