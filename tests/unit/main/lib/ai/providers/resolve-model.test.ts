import { resolveModel } from '@main/lib/ai/providers/resolve-model'
import { describe, expect, it } from 'vitest'

describe('resolveModel', () => {
  it('uses the curated override for models missing from the pi-ai registry', () => {
    // claude-opus-4-8 is newer than the installed registry and has no MODEL_METADATA_FALLBACK
    // entry (Anthropic needs none — it's expected to always carry a live-fetched snapshot).
    // Without a snapshot, this falls back to PROVIDER_DEFAULTS for Anthropic.
    const model = resolveModel(
      'anthropic',
      'claude-opus-4-8',
      'https://api.anthropic.com',
      'anthropic-messages'
    )
    expect(model.id).toBe('claude-opus-4-8')
    expect(model.provider).toBe('anthropic')
    expect(model.api).toBe('anthropic-messages')
    expect(model.cost.input).toBe(0)
    expect(model.cost.output).toBe(0)
    expect(model.contextWindow).toBe(1_000_000) // PROVIDER_DEFAULTS['anthropic']
    expect(model.maxTokens).toBe(128_000)
    expect(model.reasoning).toBe(false)
  })

  it('honors a custom baseUrl in the override path', () => {
    const model = resolveModel(
      'anthropic',
      'claude-opus-4-8',
      'https://proxy.example.com',
      'anthropic-messages'
    )
    expect(model.baseUrl).toBe('https://proxy.example.com')
  })

  it('returns registry metadata for a known model', () => {
    const model = resolveModel(
      'anthropic',
      'claude-opus-4-7',
      'https://api.anthropic.com',
      'anthropic-messages'
    )
    expect(model.id).toBe('claude-opus-4-7')
    // Registry-backed models carry real (non-zero) pricing.
    expect(model.cost.input).toBeGreaterThan(0)
  })

  it('falls back to zero cost + the provider default context for an unknown model', () => {
    const model = resolveModel(
      'openai',
      'totally-made-up-model-xyz',
      'https://api.openai.com/v1',
      'openai-completions'
    )
    expect(model.cost.input).toBe(0)
    // No override → PROVIDER_DEFAULTS['openai'] context window.
    expect(model.contextWindow).toBe(1_050_000)
  })

  it('uses the smaller ollama default context for an unknown local model', () => {
    const model = resolveModel(
      'ollama',
      'some-local-model',
      'http://localhost:11434',
      'openai-completions'
    )
    expect(model.cost.input).toBe(0)
    expect(model.contextWindow).toBe(128_000)
    expect(model.maxTokens).toBe(8192)
  })

  it('prefers a passed snapshot over the registry and MODEL_METADATA_FALLBACK', () => {
    const model = resolveModel(
      'openai',
      'gpt-5.6',
      'https://api.openai.com/v1',
      'openai-responses',
      {
        contextWindow: 999,
        maxOutputTokens: 111,
        reasoningLevels: ['off', 'max'],
        cost: { input: 1, output: 2 }
      }
    )
    expect(model.contextWindow).toBe(999)
    expect(model.maxTokens).toBe(111)
    expect(model.cost.input).toBe(1)
    expect(model.cost.output).toBe(2)
    expect(model.reasoning).toBe(true) // reasoningLevels has more than just 'off'
  })

  it('falls back to MODEL_METADATA_FALLBACK when no snapshot is passed (Ollama free-typed ids)', () => {
    const model = resolveModel(
      'openai',
      'gpt-5.6',
      'https://api.openai.com/v1',
      'openai-responses'
    )
    // gpt-5.6 has a MODEL_METADATA_FALLBACK entry (OpenAI's own list API gives us nothing else)
    expect(model.cost.input).toBeGreaterThan(0)
  })

  it('falls back to PROVIDER_DEFAULTS for a snapshot with null fields (Ollama live-fetch shape)', () => {
    const model = resolveModel(
      'ollama',
      'llama3.1:70b',
      'http://localhost:11434',
      'openai-completions',
      {
        contextWindow: null,
        maxOutputTokens: null,
        reasoningLevels: [],
        cost: null
      }
    )
    expect(model.contextWindow).toBe(128_000)
    expect(model.maxTokens).toBe(8192)
    expect(model.cost.input).toBe(0)
    expect(model.reasoning).toBe(false)
  })
})
