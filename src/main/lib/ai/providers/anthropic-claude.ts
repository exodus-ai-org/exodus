import { createAnthropic } from '@ai-sdk/anthropic'
import { Setting } from '../../db/schema'

export async function getAnthropicClaude(setting: Setting) {
  return createAnthropic({
    apiKey: setting.anthropicApiKey ?? '',
    baseURL: setting.anthropicBaseUrl ?? undefined
  })
}
