import { createAnthropic } from '@ai-sdk/anthropic'
import { Settings } from '@shared/types/db'

export function getAnthropicClaude(settings: Settings) {
  const anthropic = createAnthropic({
    apiKey: settings.providers?.anthropicApiKey ?? '',
    baseURL: settings.providers?.anthropicBaseUrl || undefined
  })

  return {
    provider: anthropic,
    chatModel: anthropic(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: anthropic(settings.providerConfig?.reasoningModel ?? '')
  }
}
