import { Providers } from '@shared/types/ai'

export const models = {
  [Providers.OpenAiGpt]: {
    chatModel: [
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'chatgpt-4o-latest'
    ],
    reasoningModel: ['o3-mini', 'o1-mini', 'o3', 'o1']
  },
  [Providers.AzureOpenAi]: {
    chatModel: [
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'chatgpt-4o-latest'
    ],
    reasoningModel: ['o3-mini', 'o1-mini', 'o3', 'o1']
  },
  [Providers.GoogleGemini]: {
    chatModel: ['gemini-2.0-flash'],
    reasoningModel: [
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.5-pro-exp-03-25',
      'gemini-2.0-flash-thinking-exp-01-21'
    ]
  },
  [Providers.XaiGrok]: {
    chatModel: ['grok-3-beta', 'grok-3-fast-beta'],
    reasoningModel: ['grok-3-mini-beta', 'grok-3-mini-fast-beta']
  },
  [Providers.AnthropicClaude]: {
    chatModel: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    reasoningModel: ['claude-3-7-sonnet-latest']
  },
  [Providers.Ollama]: {
    chatModel: [],
    reasoningModel: []
  }
}
