import type { Settings } from '@exodus/shared/schemas/settings-schema'
import { AiProviders } from '@exodus/shared/types/ai'
import { describe, expect, it } from 'vitest'

import {
  configuredProvider,
  hasProviderKey,
  modelCatalog,
  modelLabel
} from '@/lib/provider-labels'

const entry = (id: string, displayName: string) => ({
  id,
  displayName,
  snapshot: { reasoningLevels: [] }
})

const settings = (over: Partial<Settings>): Settings =>
  ({
    providerConfig: {
      provider: AiProviders.AnthropicClaude,
      model: 'claude-sonnet-5-5'
    },
    providers: { anthropicApiKey: '•••• abcd' },
    modelCatalog: {
      [AiProviders.AnthropicClaude]: [
        entry('claude-sonnet-5-5', 'Claude Sonnet 5.5')
      ]
    },
    ...over
  }) as unknown as Settings

describe('provider labels', () => {
  it('reads the configured provider, or null for none or an unknown name', () => {
    expect(configuredProvider(settings({}))).toBe(AiProviders.AnthropicClaude)
    expect(
      configuredProvider(settings({ providerConfig: { provider: 'Nope' } }))
    ).toBeNull()
    expect(configuredProvider(settings({ providerConfig: null }))).toBeNull()
    expect(configuredProvider(undefined)).toBeNull()
  })

  it('a provider has a key when its field holds one (a mask counts); Ollama needs none', () => {
    expect(hasProviderKey(settings({}))).toBe(true)
    expect(
      hasProviderKey(settings({ providers: { anthropicApiKey: '' } }))
    ).toBe(false)
    expect(hasProviderKey(settings({ providers: null }))).toBe(false)
    expect(
      hasProviderKey(
        settings({
          providerConfig: { provider: AiProviders.Ollama, model: 'llama3' },
          providers: null
        })
      )
    ).toBe(true)
    expect(hasProviderKey(undefined)).toBe(false)
  })

  it("labels the chip with the provider's short name and the model's display name, else its id", () => {
    const catalog = modelCatalog(settings({}), AiProviders.AnthropicClaude)
    expect(
      modelLabel(AiProviders.AnthropicClaude, 'claude-sonnet-5-5', catalog)
    ).toBe('Claude · Claude Sonnet 5.5')
    expect(modelLabel(AiProviders.OpenAiGpt, 'gpt-5', [])).toBe(
      'OpenAI · gpt-5'
    )
    expect(
      modelCatalog(
        settings({ modelCatalog: null }),
        AiProviders.AnthropicClaude
      )
    ).toEqual([])
  })
})
