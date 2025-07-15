import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Settings } from '@shared/types/db'

export function getGoogleGemini(settings: Settings) {
  const google = createGoogleGenerativeAI({
    apiKey: settings.providers?.googleGeminiApiKey ?? '',
    baseURL: settings.providers?.googleGeminiBaseUrl || undefined
  })

  return {
    provider: google,
    chatModel: google(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: google(settings.providerConfig?.reasoningModel ?? '')
  }
}
