import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Setting } from '@shared/types/db'

export async function getGoogleGemini(setting: Setting) {
  return createGoogleGenerativeAI({
    apiKey: setting.googleApiKey ?? '',
    baseURL: setting.googleBaseUrl ?? undefined
  })
}
