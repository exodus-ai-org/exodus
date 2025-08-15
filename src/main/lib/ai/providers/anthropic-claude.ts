import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { Settings } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getAnthropicClaude(settings: Settings): {
  provider: AnthropicProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const anthropic = createAnthropic({
    apiKey: settings.providers?.anthropicApiKey ?? '',
    baseURL: settings.providers?.anthropicBaseUrl || undefined
  })

  return {
    provider: anthropic,
    chatModel: anthropic(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: anthropic(settings.providerConfig?.reasoningModel ?? ''),
    embeddingModel: anthropic.textEmbeddingModel(
      settings.providerConfig?.embeddingModel ?? ''
    )
  }
}
