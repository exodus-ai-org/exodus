import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider
} from '@ai-sdk/google'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModel } from 'ai'

export function getGoogleGemini(setting: Setting): {
  provider: GoogleGenerativeAIProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
} {
  const google = createGoogleGenerativeAI({
    apiKey: setting.providers?.googleGeminiApiKey ?? '',
    baseURL: setting.providers?.googleGeminiBaseUrl || undefined
  })

  return {
    provider: google,
    chatModel: google(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: google(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: google.embeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
