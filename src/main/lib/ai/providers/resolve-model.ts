import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'

interface FallbackDefaults {
  contextWindow: number
  maxTokens: number
}

const PROVIDER_DEFAULTS: Partial<Record<string, FallbackDefaults>> = {
  openai: { contextWindow: 128000, maxTokens: 16384 },
  anthropic: { contextWindow: 200000, maxTokens: 8096 },
  'azure-openai-responses': { contextWindow: 128000, maxTokens: 16384 },
  google: { contextWindow: 1000000, maxTokens: 8192 },
  xai: { contextWindow: 131072, maxTokens: 16384 },
  ollama: { contextWindow: 128000, maxTokens: 8192 }
}

export function resolveModel(
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
    const defaults = PROVIDER_DEFAULTS[provider] ?? {
      contextWindow: 128000,
      maxTokens: 8192
    }
    return {
      id,
      name: id,
      api,
      provider,
      baseUrl,
      reasoning: false,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: defaults.contextWindow,
      maxTokens: defaults.maxTokens
    }
  }
}
