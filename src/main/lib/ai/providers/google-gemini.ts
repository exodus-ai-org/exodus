import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Setting } from '../../db/schema'

export async function getGoogleGemini(setting: Setting) {
  return createGoogleGenerativeAI({
    apiKey: setting.googleApiKey ?? '',
    baseURL: setting.googleBaseUrl ?? undefined
  })
}
