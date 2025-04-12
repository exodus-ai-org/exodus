import { createXai } from '@ai-sdk/xai'
import { Setting } from '@shared/types/db'

export async function getXaiGrok(setting: Setting) {
  return createXai({
    apiKey: setting.xAiApiKey ?? '',
    baseURL: setting.xAiBaseUrl ?? undefined
  })
}
