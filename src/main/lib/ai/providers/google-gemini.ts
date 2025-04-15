import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Setting } from '@shared/types/db'

export async function getGoogleGemini(setting: Setting) {
  const google = createGoogleGenerativeAI({
    apiKey: setting.googleApiKey ?? '',
    baseURL: setting.googleBaseUrl ?? undefined
  })

  return {
    chatModel: google(setting.chatModel ?? ''),
    reasoningModel: google(setting.reasoningModel ?? '')
  }
}
