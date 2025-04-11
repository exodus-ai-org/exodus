import { createDeepSeek } from '@ai-sdk/deepseek'
import { Setting } from '../../db/schema'

export async function getDeepSeek(setting: Setting) {
  return createDeepSeek({
    apiKey: setting.deepSeekApiKey ?? '',
    baseURL: setting.deepSeekBaseUrl ?? undefined
  })
}
