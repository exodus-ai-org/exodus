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
    reasoningModel: ['o4-mini', 'o3-mini', 'o3', 'o1', 'o1-pro']
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
    reasoningModel: ['o4-mini', 'o3-mini', 'o3', 'o1', 'o1-pro']
  },
  [Providers.GoogleGemini]: {
    chatModel: ['gemini-2.5-flash-preview-05-20'],
    reasoningModel: ['gemini-2.5-pro-preview-05-06']
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
