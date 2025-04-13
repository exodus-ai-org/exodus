import { Providers } from '@shared/types/ai'

export const models = {
  [Providers.OpenAiGpt]: {
    chatModel: [
      'gpt-4.5-preview',
      'gpt-4o',
      'chatgpt-4o-latest',
      'gpt-4o-mini'
    ],
    reasoningModel: ['o3-mini', 'o1-mini', 'o3', 'o1']
  },
  [Providers.AzureOpenAi]: {
    chatModel: [
      'gpt-4.5-preview',
      'gpt-4o',
      'chatgpt-4o-latest',
      'gpt-4o-mini'
    ],
    reasoningModel: ['o3-mini', 'o1-mini', 'o3', 'o1']
  },
  [Providers.GoogleGemini]: {
    chatModel: ['gemini-2.0-flash'],
    reasoningModel: [
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.0-flash-thinking-exp-01-21'
    ]
  },
  [Providers.XaiGrok]: {
    chatModel: ['grok-3-fast'],
    reasoningModel: ['grok-3-mini', 'grok-3-mini-fast']
  },
  [Providers.DeepSeek]: {
    chatModel: ['deepseek-chat'],
    reasoningModel: ['deepseek-reasoner']
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
