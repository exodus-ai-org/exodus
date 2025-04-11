import { createOpenAI } from '@ai-sdk/openai'
import { Setting } from '../../db/schema'

export async function getOpenAi(setting: Setting) {
  return createOpenAI({
    apiKey: setting.openaiApiKey ?? '',
    baseURL: setting.openaiBaseUrl ?? undefined
  })
}
