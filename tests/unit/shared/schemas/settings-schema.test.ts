import {
  AppearanceSchema,
  EffortLevelSchema,
  ModelSnapshotSchema,
  ProviderConfigSchema
} from '@exodus/shared/schemas/settings-schema'
import { describe, expect, it } from 'vitest'

describe('EffortLevelSchema', () => {
  it('accepts every defined level', () => {
    for (const level of ['off', 'low', 'medium', 'high', 'xhigh', 'max']) {
      expect(EffortLevelSchema.safeParse(level).success).toBe(true)
    }
  })

  it('rejects an unknown level', () => {
    expect(EffortLevelSchema.safeParse('extreme').success).toBe(false)
  })
})

describe('ModelSnapshotSchema', () => {
  it('accepts a full snapshot', () => {
    const result = ModelSnapshotSchema.safeParse({
      contextWindow: 200_000,
      maxOutputTokens: 8_000,
      reasoningLevels: ['off', 'high'],
      cost: { input: 2, output: 10 }
    })
    expect(result.success).toBe(true)
  })

  it('accepts null cost and empty reasoningLevels (Ollama shape)', () => {
    const result = ModelSnapshotSchema.safeParse({
      contextWindow: null,
      maxOutputTokens: null,
      reasoningLevels: [],
      cost: null
    })
    expect(result.success).toBe(true)
  })
})

describe('ProviderConfigSchema', () => {
  it('no longer has chatModel/reasoningModel fields', () => {
    const parsed = ProviderConfigSchema.parse({
      provider: 'OpenAI GPT',
      model: 'gpt-5.6'
    })
    expect(parsed).not.toHaveProperty('chatModel')
    expect(parsed).not.toHaveProperty('reasoningModel')
  })

  it('accepts a full modelSnapshot alongside model', () => {
    const parsed = ProviderConfigSchema.parse({
      provider: 'OpenAI GPT',
      model: 'gpt-5.6',
      modelSnapshot: {
        contextWindow: 1_050_000,
        maxOutputTokens: 128_000,
        reasoningLevels: ['off', 'high'],
        cost: { input: 4, output: 20 }
      }
    })
    expect(parsed.modelSnapshot?.contextWindow).toBe(1_050_000)
  })
})

describe('AppearanceSchema', () => {
  it('fills every default from an empty object', () => {
    const parsed = AppearanceSchema.parse({})
    expect(parsed.light.preset).toBe('exodus')
    expect(parsed.dark.preset).toBe('exodus')
    expect(parsed.uiFont).toEqual({ family: 'system', weight: 'light' })
    expect(parsed.contentFont).toEqual({ family: 'ui', weight: 'light' })
    expect(parsed.translucentSidebar).toBe(true)
    expect(parsed.contrast).toBe(50)
  })

  it('accepts overrides as 6-digit hex only', () => {
    expect(
      AppearanceSchema.safeParse({ light: { accent: '#1F6FEB' } }).success
    ).toBe(true)
    expect(
      AppearanceSchema.safeParse({ light: { accent: 'blue' } }).success
    ).toBe(false)
    expect(
      AppearanceSchema.safeParse({ light: { accent: '#fff' } }).success
    ).toBe(false)
  })

  it('bounds contrast to 0..100 and coerces the form string', () => {
    expect(AppearanceSchema.safeParse({ contrast: 101 }).success).toBe(false)
    expect(AppearanceSchema.parse({ contrast: '70' }).contrast).toBe(70)
  })
})
