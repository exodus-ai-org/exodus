import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider
} from '@ai-sdk/google'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { Settings } from '@shared/types/db'
import type { EmbeddingModel } from 'ai'

export function getGoogleGemini(settings: Settings): {
  provider: GoogleGenerativeAIProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
  embeddingModel: EmbeddingModel<string> | null
} {
  const google = createGoogleGenerativeAI({
    apiKey: settings.providers?.googleGeminiApiKey ?? '',
    baseURL: settings.providers?.googleGeminiBaseUrl || undefined
  })

  return {
    provider: google,
    chatModel: google(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: google(settings.providerConfig?.reasoningModel ?? ''),
    embeddingModel: google.textEmbeddingModel(
      settings.providerConfig?.embeddingModel ?? ''
    )
  }
}
