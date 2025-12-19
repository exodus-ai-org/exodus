import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider
} from '@ai-sdk/google'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getGoogleGemini(setting: Setting): {
  provider: GoogleGenerativeAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const google = createGoogleGenerativeAI({
    apiKey: setting.providers?.googleGeminiApiKey ?? '',
    baseURL: setting.providers?.googleGeminiBaseUrl || undefined
  })

  return {
    provider: google,
    chatModel: google(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: google(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: google.textEmbeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
