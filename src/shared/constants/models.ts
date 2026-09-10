import { AiProviders } from '@shared/types/ai'

interface ProviderModels {
  chatModel: string[]
  reasoningModel: string[]
}

// Refreshed against the providers' docs on 2026-09-10. First entry in each
// `chatModel` list is the sensible default.
const OPENAI_MODELS: ProviderModels = {
  chatModel: [
    'gpt-5.6',
    'gpt-6-astra',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'gpt-5.5',
    'gpt-5.3-codex'
  ],
  reasoningModel: ['gpt-6-astra', 'gpt-5.6', 'gpt-5.6-terra']
}

export const models: Record<AiProviders, ProviderModels> = {
  [AiProviders.OpenAiGpt]: OPENAI_MODELS,
  [AiProviders.AzureOpenAi]: OPENAI_MODELS,
  [AiProviders.GoogleGemini]: {
    chatModel: [
      'gemini-3.1-pro-preview',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash'
    ],
    reasoningModel: [
      'gemini-3.1-pro-preview',
      'gemini-3.8-flash',
      'gemini-2.5-pro'
    ]
  },
  [AiProviders.XaiGrok]: {
    chatModel: ['grok-4.6', 'grok-4.5', 'grok-4.3', 'grok-4.1-fast'],
    reasoningModel: ['grok-4.6', 'grok-4.5', 'grok-4.3']
  },
  [AiProviders.AnthropicClaude]: {
    chatModel: [
      'claude-opus-5',
      'claude-fable-5-1',
      'claude-sonnet-5',
      'claude-haiku-4-5'
    ],
    reasoningModel: ['claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5']
  },
  [AiProviders.Ollama]: {
    chatModel: [],
    reasoningModel: []
  }
}

export type ModelRole = 'chatModel' | 'reasoningModel'

/**
 * Whether `id` is still one of the models we offer for this provider/role.
 *
 * The lists above track each provider's current lineup and legacy ids get
 * dropped without ceremony, so a model a user picked long ago can quietly
 * fall off the list after an app update — losing its cost readout / context
 * window and eventually 404-ing at the provider. Callers use this to warn.
 *
 * An empty list (Ollama) means "free-form" — any id is accepted.
 */
export function isCurrentModel(
  provider: AiProviders,
  role: ModelRole,
  id: string | null | undefined
): boolean {
  if (!id) return true
  const list = models[provider][role]
  if (list.length === 0) return true
  return list.includes(id)
}
