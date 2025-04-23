import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Setting } from '@shared/types/db'

export function getGoogleGemini(setting: Setting) {
  const google = createGoogleGenerativeAI({
    apiKey: setting.googleGeminiApiKey ?? '',
    baseURL: setting.googleGeminiBaseUrl ?? undefined
  })

  return {
    provider: google,
    chatModel: google(setting.chatModel ?? ''),
    reasoningModel: google(setting.reasoningModel ?? '')
  }
}
