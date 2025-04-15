import { createDeepSeek } from '@ai-sdk/deepseek'
import { Setting } from '@shared/types/db'

export async function getDeepSeek(setting: Setting) {
  const deepseek = createDeepSeek({
    apiKey: setting.deepSeekApiKey ?? '',
    baseURL: setting.deepSeekBaseUrl ?? undefined
  })

  return {
    chatModel: deepseek(setting.chatModel ?? ''),
    reasoningModel: deepseek(setting.reasoningModel ?? '')
  }
}
