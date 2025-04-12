import { createAnthropic } from '@ai-sdk/anthropic'
import { Setting } from '@shared/types/db'

export async function getAnthropicClaude(setting: Setting) {
  return createAnthropic({
    apiKey: setting.anthropicApiKey ?? '',
    baseURL: setting.anthropicBaseUrl ?? undefined
  })
}
