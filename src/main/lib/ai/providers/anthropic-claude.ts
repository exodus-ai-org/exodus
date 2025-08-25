import { type AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { Settings } from '@shared/types/db'
import type { EmbeddingModel } from 'ai'

export function getAnthropicClaude(settings: Settings): {
  provider: AnthropicProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
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
