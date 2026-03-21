import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getAnthropicClaude(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.anthropicBaseUrl ?? 'https://api.anthropic.com'
  const chatModelId = setting.providerConfig?.chatModel ?? 'claude-opus-4-5'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'claude-opus-4-5'

  return {
    chatModel: resolveModel(
      'anthropic',
      chatModelId,
      baseUrl,
      'anthropic-messages'
    ),
    reasoningModel: resolveModel(
      'anthropic',
      reasoningModelId,
      baseUrl,
      'anthropic-messages'
    )
  }
}
