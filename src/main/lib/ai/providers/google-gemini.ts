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
      contextWindow: 1000000,
      maxTokens: 8192
    }
  }
}

export function getGoogleGemini(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.googleGeminiBaseUrl ??
    'https://generativelanguage.googleapis.com/v1beta'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gemini-2.0-flash'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gemini-2.0-flash'

  return {
    chatModel: resolveModel(
      'google',
      chatModelId,
      baseUrl,
      'google-generative-ai'
    ),
    reasoningModel: resolveModel(
      'google',
      reasoningModelId,
      baseUrl,
      'google-generative-ai'
    )
  }
}
