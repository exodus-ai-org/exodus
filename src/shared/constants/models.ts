import { Providers } from '@shared/types/ai'

export const models = {
  [Providers.OpenAiGpt]: {
    chatModel: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-chat-latest',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'chatgpt-4o-latest'
    ],
    reasoningModel: ['o4-mini', 'o3-mini', 'o3'],
    embeddingModel: [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002'
    ]
  },
  [Providers.AzureOpenAi]: {
    chatModel: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-chat-latest',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'chatgpt-4o-latest'
    ],
    reasoningModel: ['o4-mini', 'o3-mini', 'o3'],
    embeddingModel: [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002'
    ]
  },
  [Providers.GoogleGemini]: {
    chatModel: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash'
    ],
    reasoningModel: ['gemini-2.5-pro'],
    embeddingModel: ['gemini-embedding-001']
  },
  [Providers.XaiGrok]: {
    chatModel: ['grok-3-beta', 'grok-3-fast-beta'],
    reasoningModel: ['grok-3-mini-beta', 'grok-3-mini-fast-beta'],
    embeddingModel: []
  },
  [Providers.AnthropicClaude]: {
    chatModel: ['claude-opus-4-1-20250805', 'claude-opus-4-20250514'],
    reasoningModel: ['claude-opus-4-1-20250805', 'claude-sonnet-4-20250514'],
    embeddingModel: [
      'voyage-3-large',
      'voyage-3.5',
      'voyage-3.5-lite',
      'voyage-code-3',
      'voyage-finance-2',
      'voyage-law-2'
    ]
  },
  [Providers.Ollama]: {
    chatModel: [],
    reasoningModel: [],
    embeddingModel: []
  }
}
