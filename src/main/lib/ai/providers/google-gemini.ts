import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider
} from '@ai-sdk/google'
import { Settings } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getGoogleGemini(settings: Settings): {
  provider: GoogleGenerativeAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
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
