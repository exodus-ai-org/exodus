import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { Settings } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getOpenAi(settings: Settings): {
  provider: OpenAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
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
