import { resolveModel } from '@main/lib/ai/providers/resolve-model'
import { describe, expect, it } from 'vitest'

describe('resolveModel', () => {
  it('uses the curated override for models missing from the pi-ai registry', () => {
    // claude-opus-4-8 is newer than the installed registry — without the
    // override it would fall back to $0 cost and a 128k context window.
    const model = resolveModel(
      'anthropic',
      'claude-opus-4-8',
      'https://api.anthropic.com',
      'anthropic-messages'
    )
    expect(model.id).toBe('claude-opus-4-8')
    expect(model.provider).toBe('anthropic')
    expect(model.api).toBe('anthropic-messages')
    expect(model.cost.input).toBe(5)
    expect(model.cost.output).toBe(25)
    expect(model.contextWindow).toBe(1_000_000)
    expect(model.maxTokens).toBe(128_000)
    expect(model.reasoning).toBe(true)
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

  it('falls back to zero cost for an unknown model with no override', () => {
    const model = resolveModel(
      'openai',
      'totally-made-up-model-xyz',
      'https://api.openai.com/v1',
      'openai-completions'
    )
    expect(model.cost.input).toBe(0)
    expect(model.contextWindow).toBe(128000)
  })
})
