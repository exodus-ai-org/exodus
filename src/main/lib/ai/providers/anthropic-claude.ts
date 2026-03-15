import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

export function getAnthropicClaude(setting: Setting): {
  chatModel: Model<'anthropic-messages'>
  reasoningModel: Model<'anthropic-messages'>
  embeddingConfig: EmbeddingConfig | null
} {
  const baseUrl =
    setting.providers?.anthropicBaseUrl ?? 'https://api.anthropic.com'
  const chatModelId = setting.providerConfig?.chatModel ?? 'claude-opus-4-5'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'claude-opus-4-5'

  const makeModel = (id: string): Model<'anthropic-messages'> => ({
    id,
    name: id,
    api: 'anthropic-messages',
    provider: 'anthropic',
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 8096
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId),
    embeddingConfig: null
  }
}
