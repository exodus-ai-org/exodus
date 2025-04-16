import { createOpenAI } from '@ai-sdk/openai'
import { Setting } from '@shared/types/db'

export function getOpenAi(setting: Setting) {
  const openai = createOpenAI({
    apiKey: setting.openaiApiKey ?? '',
    baseURL: setting.openaiBaseUrl ?? undefined
  })

  return {
    provider: openai,
    chatModel: openai(setting.chatModel ?? ''),
    reasoningModel: openai(setting.reasoningModel ?? '')
  }
}
