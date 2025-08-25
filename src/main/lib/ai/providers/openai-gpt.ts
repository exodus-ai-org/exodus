import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { Settings } from '@shared/types/db'
import type { EmbeddingModel } from 'ai'

export function getOpenAi(settings: Settings): {
  provider: OpenAIProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
  embeddingModel: EmbeddingModel<string> | null
} {
  const openai = createOpenAI({
    apiKey: settings.providers?.openaiApiKey ?? '',
    baseURL: settings.providers?.openaiBaseUrl || undefined
  })

  return {
    provider: openai,
    chatModel: openai(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: openai(settings.providerConfig?.reasoningModel ?? ''),
    embeddingModel: openai.textEmbeddingModel(
      settings.providerConfig?.embeddingModel ?? ''
    )
  }
}
