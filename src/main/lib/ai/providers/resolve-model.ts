import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'
import type { ModelSnapshot } from '@shared/schemas/settings-schema'

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
 * Metadata for a model id when no live-fetched snapshot is available (e.g. an
 * Ollama id typed free-hand, or a settings row saved before this feature
 * existed). Scoped to exactly what each provider's own list-models API omits
 * — see `src/main/lib/ai/providers/list-models/` for what's fetched live.
 * Numbers ported from the previous hand-maintained MODEL_OVERRIDES table.
 */
export const MODEL_METADATA_FALLBACK: Record<string, Partial<ModelSnapshot>> = {
  // ── OpenAI — its list API returns only id/created/owned_by, nothing else.
  'gpt-6-astra': {
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    reasoningLevels: ['off', 'low', 'medium', 'high', 'xhigh'],
    cost: { input: 10, output: 50 }
  },
  'gpt-5.6': {
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    reasoningLevels: ['off', 'low', 'medium', 'high', 'xhigh'],
    cost: { input: 4, output: 20 }
  },
  'gpt-5.6-terra': {
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    reasoningLevels: ['off', 'low', 'medium', 'high', 'xhigh'],
    cost: { input: 2, output: 12 }
  },
  'gpt-5.6-luna': {
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    reasoningLevels: ['off', 'low', 'medium'],
    cost: { input: 0.2, output: 1.2 }
  },
  // ── Google — list API gives context/tokens/boolean-thinking live; cost only here.
  'gemini-3.8-flash': { cost: { input: 0.75, output: 3.75 } },
  'gemini-3.7-flash': { cost: { input: 0.75, output: 3.75 } },
  'gemini-3.5-flash-lite': { cost: { input: 0.3, output: 2.5 } },
  // ── xAI — list API gives context + cost live; reasoning levels only here.
  'grok-4.6': { reasoningLevels: [] },
  'grok-4.5': { reasoningLevels: [] },
  'grok-4.1-fast': { reasoningLevels: [] }
  // Anthropic needs no entries — its list API is complete (see spec §Context).
}

export function resolveModel(
  provider: KnownProvider,
  id: string,
  baseUrl: string,
  api: Api,
  snapshot?: ModelSnapshot
): Model<string> {
  const defaults = PROVIDER_DEFAULTS[provider] ?? {
    contextWindow: 128000,
    maxTokens: 8192
  }

  // A live-fetched snapshot can still have null/empty fields (Ollama's is
  // always all-null; an unknown OpenAI id with no MODEL_METADATA_FALLBACK
  // entry has none either) — fall back to the same PROVIDER_DEFAULTS used
  // below rather than letting contextWindow/maxTokens/cost end up undefined,
  // which would silently break LCM's context-budget math downstream.
  if (snapshot) {
    const hasReasoning = snapshot.reasoningLevels.some((l) => l !== 'off')

    // pi-ai's clampThinkingLevel() silently clamps a requested 'xhigh' down to
    // 'high' whenever a model has no thinkingLevelMap entry for 'xhigh' (see
    // getSupportedThinkingLevels in @mariozechner/pi-ai/dist/models.js — a
    // missing map entry means the level isn't "supported"). Our app-level
    // EffortLevel 'max' already collapses to pi-ai's 'xhigh' before it gets
    // here (see chat.ts), so a model whose snapshot reports 'max' or 'xhigh'
    // support needs an explicit thinkingLevelMap.xhigh entry or those top two
    // composer tiers silently do nothing.
    const thinkingLevelMap = hasReasoning
      ? snapshot.reasoningLevels.includes('max')
        ? { xhigh: 'max' }
        : snapshot.reasoningLevels.includes('xhigh')
          ? { xhigh: 'xhigh' }
          : undefined
      : undefined

    return {
      id,
      name: id,
      provider,
      api,
      baseUrl,
      input: ['text', 'image'],
      reasoning: hasReasoning,
      thinkingLevelMap,
      contextWindow: snapshot.contextWindow ?? defaults.contextWindow,
      maxTokens: snapshot.maxOutputTokens ?? defaults.maxTokens,
      // ModelSnapshotSchema (src/shared/schemas/settings-schema.ts) has no
      // field for cache pricing — none of the list-models handlers this
      // snapshot came from report cache read/write rates, so cost estimates
      // under-report for any model that gets a real cache discount. This is
      // a known gap in the schema, not fixed here (too large/risky for a
      // one-shot fix) — revisit if ModelSnapshotSchema ever gains cache-rate
      // fields.
      cost: snapshot.cost
        ? { ...snapshot.cost, cacheRead: 0, cacheWrite: 0 }
        : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    }
  }

  try {
    // @ts-expect-error — model ID is user-configured, may not be in registry; fallback below handles it
    const registered = getModel(provider, id)
    return baseUrl !== registered.baseUrl
      ? { ...registered, baseUrl }
      : registered
  } catch {
    const fallback = MODEL_METADATA_FALLBACK[id]
    return {
      id,
      name: id,
      api,
      provider,
      baseUrl,
      reasoning: (fallback?.reasoningLevels ?? []).some((l) => l !== 'off'),
      input: ['text', 'image'],
      cost: fallback?.cost
        ? { ...fallback.cost, cacheRead: 0, cacheWrite: 0 }
        : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: fallback?.contextWindow ?? defaults.contextWindow,
      maxTokens: fallback?.maxOutputTokens ?? defaults.maxTokens
    }
  }
}
