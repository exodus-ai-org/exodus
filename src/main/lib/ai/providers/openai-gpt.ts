import { createOpenAI } from '@ai-sdk/openai'
import { Setting } from '@shared/types/db'

export async function getOpenAi(setting: Setting) {
  const openai = createOpenAI({
    apiKey: setting.openaiApiKey ?? '',
    baseURL: setting.openaiBaseUrl ?? undefined
  })

  return {
    chatModel: openai(setting.chatModel ?? ''),
    reasoningModel: openai(setting.reasoningModel ?? '')
  }
}
