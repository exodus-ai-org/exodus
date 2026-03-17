import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

function resolveModel(
  provider: KnownProvider,
  id: string,
  baseUrl: string,
  api: Api
): Model<string> {
  try {
    // @ts-expect-error — model ID is user-configured, may not be in registry; fallback below handles it
    const registered = getModel(provider, id)
    return baseUrl !== registered.baseUrl
      ? { ...registered, baseUrl }
      : registered
  } catch {
    return {
      id,
      name: id,
      api,
      provider,
      baseUrl,
      reasoning: false,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 8096
    }
  }
}

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
