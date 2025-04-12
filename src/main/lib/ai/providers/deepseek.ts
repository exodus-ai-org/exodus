import { createDeepSeek } from '@ai-sdk/deepseek'
import { Setting } from '@shared/types/db'

export async function getDeepSeek(setting: Setting) {
  return createDeepSeek({
    apiKey: setting.deepSeekApiKey ?? '',
    baseURL: setting.deepSeekBaseUrl ?? undefined
  })
}
