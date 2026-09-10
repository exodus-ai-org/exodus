import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'

interface FallbackDefaults {
  contextWindow: number
  maxTokens: number
}

const PROVIDER_DEFAULTS: Partial<Record<string, FallbackDefaults>> = {
  openai: { contextWindow: 1_050_000, maxTokens: 128_000 },
  anthropic: { contextWindow: 1_000_000, maxTokens: 128_000 },
  'azure-openai-responses': { contextWindow: 1_050_000, maxTokens: 128_000 },
  google: { contextWindow: 1_000_000, maxTokens: 65_536 },
  xai: { contextWindow: 500_000, maxTokens: 128_000 },
  ollama: { contextWindow: 128_000, maxTokens: 8192 }
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

const TEXT_IMAGE: Model<string>['input'] = ['text', 'image']

// Prices / context from each provider's own docs, checked 2026-09-10.
const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // ── Anthropic ──────────────────────────────────────────────────────────
  'claude-opus-5': {
    name: 'Claude Opus 5',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    contextWindow: 1_000_000,
    maxTokens: 128_000
  },
  'claude-fable-5-1': {
    name: 'Claude Fable 5.1',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
    contextWindow: 1_000_000,
    maxTokens: 128_000
  },
  'claude-sonnet-5': {
    name: 'Claude Sonnet 5',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    contextWindow: 1_000_000,
    maxTokens: 128_000
  },
  'claude-opus-4-8': {
    name: 'Claude Opus 4.8',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    contextWindow: 1_000_000,
    maxTokens: 128_000
  },
  // ── OpenAI ─────────────────────────────────────────────────────────────
  'gpt-6-astra': {
    name: 'GPT-6 Astra',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 },
    contextWindow: 1_050_000,
    maxTokens: 128_000
  },
  'gpt-5.6': {
    name: 'GPT-5.6',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 4, output: 20, cacheRead: 0.4, cacheWrite: 0 },
    contextWindow: 1_050_000,
    maxTokens: 128_000
  },
  'gpt-5.6-terra': {
    name: 'GPT-5.6 Terra',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 0 },
    contextWindow: 1_050_000,
    maxTokens: 128_000
  },
  'gpt-5.6-luna': {
    name: 'GPT-5.6 Luna',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0 },
    contextWindow: 1_050_000,
    maxTokens: 128_000
  },
  // ── xAI ────────────────────────────────────────────────────────────────
  'grok-4.6': {
    name: 'Grok 4.6',
    reasoning: false,
    input: TEXT_IMAGE,
    cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 },
    contextWindow: 500_000,
    maxTokens: 128_000
  },
  'grok-4.5': {
    name: 'Grok 4.5',
    reasoning: false,
    input: TEXT_IMAGE,
    cost: { input: 2, output: 6, cacheRead: 0.3, cacheWrite: 0 },
    contextWindow: 500_000,
    maxTokens: 128_000
  },
  'grok-4.1-fast': {
    name: 'Grok 4.1 Fast',
    reasoning: false,
    input: TEXT_IMAGE,
    cost: { input: 0.2, output: 0.5, cacheRead: 0.05, cacheWrite: 0 },
    contextWindow: 2_000_000,
    maxTokens: 128_000
  },
  // ── Google ─────────────────────────────────────────────────────────────
  // gemini-3.1-pro-preview and grok-4.3 are already in the pi-ai registry.
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 0.75, output: 3.75, cacheRead: 0.075, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536
  },
  'gemini-3.7-flash': {
    name: 'Gemini 3.7 Flash',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 0.75, output: 3.75, cacheRead: 0.075, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536
  },
  'gemini-3.5-flash-lite': {
    name: 'Gemini 3.5 Flash Lite',
    reasoning: true,
    thinkingLevelMap: { xhigh: 'xhigh' },
    input: TEXT_IMAGE,
    cost: { input: 0.3, output: 2.5, cacheRead: 0.03, cacheWrite: 0 },
    contextWindow: 1_000_000,
    maxTokens: 65_536
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
