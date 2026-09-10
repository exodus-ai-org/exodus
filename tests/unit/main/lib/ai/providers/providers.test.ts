import { providers } from '@main/lib/ai/providers'
import type { Settings } from '@main/lib/db/schema'
import { AiProviders } from '@shared/types/ai'
import { describe, expect, it } from 'vitest'

const settings = (over: Partial<Settings> = {}): Settings =>
  ({ id: 's', ...over }) as unknown as Settings

describe('providers table', () => {
  it('each registry-backed provider resolves its pi-ai provider + default ids', () => {
    const cases: [AiProviders, string, string, string][] = [
      [AiProviders.OpenAiGpt, 'openai', 'gpt-5.6', 'gpt-6-astra'],
      [
        AiProviders.AzureOpenAi,
        'azure-openai-responses',
        'gpt-5.6',
        'gpt-6-astra'
      ],
      [
        AiProviders.AnthropicClaude,
        'anthropic',
        'claude-opus-5',
        'claude-opus-5'
      ],
      [
        AiProviders.GoogleGemini,
        'google',
        'gemini-3.1-pro-preview',
        'gemini-3.1-pro-preview'
      ],
      [AiProviders.XaiGrok, 'xai', 'grok-4.6', 'grok-4.6']
    ]
    for (const [key, provider, chatId, reasoningId] of cases) {
      const { chatModel, reasoningModel } = providers[key](settings())
      expect(chatModel.provider, key).toBe(provider)
      expect(chatModel.id, key).toBe(chatId)
      expect(reasoningModel.id, key).toBe(reasoningId)
    }
  })

  it('honours an explicit model id and a custom base URL', () => {
    const { chatModel, reasoningModel } = providers[
      AiProviders.AnthropicClaude
    ](
      settings({
        providers: { anthropicBaseUrl: 'https://proxy.example.com' },
        providerConfig: { chatModel: 'my-chat', reasoningModel: 'my-reason' }
      } as Partial<Settings>)
    )
    expect(chatModel.id).toBe('my-chat')
    expect(reasoningModel.id).toBe('my-reason')
    expect(chatModel.baseUrl).toBe('https://proxy.example.com')
  })

  it('falls back to each provider default base URL', () => {
    expect(providers[AiProviders.OpenAiGpt](settings()).chatModel.baseUrl).toBe(
      'https://api.openai.com/v1'
    )
    expect(providers[AiProviders.XaiGrok](settings()).chatModel.baseUrl).toBe(
      'https://api.x.ai/v1'
    )
  })

  it('ollama builds a hand-rolled model from the typed id', () => {
    const { chatModel } = providers[AiProviders.Ollama](
      settings({
        providerConfig: { chatModel: 'llama3.1:70b' }
      } as Partial<Settings>)
    )
    expect(chatModel.id).toBe('llama3.1:70b')
    expect(chatModel.contextWindow).toBe(128000)
    expect(chatModel.cost.input).toBe(0)
  })
})
