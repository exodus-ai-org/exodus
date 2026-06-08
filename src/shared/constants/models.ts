import { AiProviders } from '@shared/types/ai'

export const models = {
  [AiProviders.OpenAiGpt]: {
    chatModel: [
      'gpt-5.5',
      'gpt-5.5-pro',
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano'
    ],
    reasoningModel: ['gpt-5.5-pro', 'gpt-5.5', 'gpt-5.4-pro']
  },
  [AiProviders.AzureOpenAi]: {
    chatModel: [
      'gpt-5.5',
      'gpt-5.5-pro',
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano'
    ],
    reasoningModel: ['gpt-5.5-pro', 'gpt-5.5', 'gpt-5.4-pro']
  },
  [AiProviders.GoogleGemini]: {
    chatModel: [
      'gemini-3.1-pro',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ],
    reasoningModel: ['gemini-3.1-pro', 'gemini-2.5-pro']
  },
  [AiProviders.XaiGrok]: {
    chatModel: ['grok-4.3', 'grok-4.1-fast', 'grok-4', 'grok-code-fast-1'],
    reasoningModel: ['grok-4.3', 'grok-4']
  },
  [AiProviders.AnthropicClaude]: {
    chatModel: [
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
      'claude-haiku-4-5'
    ],
    reasoningModel: ['claude-opus-4-8', 'claude-sonnet-4-6']
  },
  [AiProviders.Ollama]: {
    chatModel: [],
    reasoningModel: []
  }
}
