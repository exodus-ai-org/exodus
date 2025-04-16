import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Setting } from '@shared/types/db'

export function getGoogleGemini(setting: Setting) {
  const google = createGoogleGenerativeAI({
    apiKey: setting.googleApiKey ?? '',
    baseURL: setting.googleBaseUrl ?? undefined
  })

  return {
    provider: google,
    chatModel: google(setting.chatModel ?? ''),
    reasoningModel: google(setting.reasoningModel ?? '')
  }
}
