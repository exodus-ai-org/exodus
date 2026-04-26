import { AiProviders } from '@shared/types/ai'

export const models = {
  [AiProviders.OpenAiGpt]: {
    chatModel: [
      'gpt-5.5',
      'gpt-5.5-pro',
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.3-codex',
      'gpt-5-mini'
    ],
    reasoningModel: ['gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro']
  },
  [AiProviders.AzureOpenAi]: {
    chatModel: [
      'gpt-5.5',
      'gpt-5.5-pro',
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.3-codex',
      'gpt-5-mini'
    ],
    reasoningModel: ['gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro']
  },
  [AiProviders.GoogleGemini]: {
    chatModel: [
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ],
    reasoningModel: ['gemini-3.1-pro-preview', 'gemini-2.5-pro']
  },
  [AiProviders.XaiGrok]: {
    chatModel: [
      'grok-4.20-beta',
      'grok-4.1-fast',
      'grok-4-fast',
      'grok-code-fast-1'
    ],
    reasoningModel: ['grok-4.20-beta', 'grok-4-1-fast-reasoning', 'grok-4']
  },
  [AiProviders.AnthropicClaude]: {
    chatModel: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    reasoningModel: ['claude-opus-4-6', 'claude-sonnet-4-6']
  },
  [AiProviders.Ollama]: {
    chatModel: [],
    reasoningModel: []
  }
}
