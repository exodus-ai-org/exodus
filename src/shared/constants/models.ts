import { AiProviders } from '@shared/types/ai'

// Refreshed against the providers' docs on 2026-09-10. First entry in each
// `chatModel` list is the sensible default.
const OPENAI_MODELS = {
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

export const models = {
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
