import { createAnthropic } from '@ai-sdk/anthropic'
import { Setting } from '@shared/types/db'

export async function getAnthropicClaude(setting: Setting) {
  const anthropic = createAnthropic({
    apiKey: setting.anthropicApiKey ?? '',
    baseURL: setting.anthropicBaseUrl ?? undefined
  })

  return {
    chatModel: anthropic(setting.chatModel ?? ''),
    reasoningModel: anthropic(setting.reasoningModel ?? '')
  }
}
