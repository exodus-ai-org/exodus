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

/**
 * Metadata for models newer than the installed pi-ai registry. Without an entry
 * here, resolveModel() falls back to zero cost + a 128k context window — which
 * silently hides the cost readout and feeds LCM compaction the wrong context
 * size. Keyed by model id; merged over the caller's provider/api/baseUrl.
 * Numbers come from the providers' official docs. Delete an entry once the
 * pi-ai registry ships that model.
 */
type ModelOverride = Pick<
  Model<string>,
  | 'name'
  | 'reasoning'
  | 'thinkingLevelMap'
  | 'input'
  | 'cost'
  | 'contextWindow'
  | 'maxTokens'
>

const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // Anthropic docs: $5 / $25 per MTok, 1M context, 128k max output.
  // Cache rates mirror Claude Opus 4.7 in the registry (0.5 / 6.25).
  'claude-opus-4-8': {
    name: 'Claude Opus 4.8',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: ['text', 'image'],
    cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    contextWindow: 1000000,
    maxTokens: 128000
  }
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
    // Registry miss — use a curated override (full metadata) when we have one,
    // so models newer than the installed pi-ai still report cost and context.
    const override = MODEL_OVERRIDES[id]
    if (override) {
      return { id, provider, api, baseUrl, ...override }
    }
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
