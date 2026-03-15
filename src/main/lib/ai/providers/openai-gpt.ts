import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

export interface EmbeddingConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export function getOpenAi(setting: Setting): {
  chatModel: Model<'openai-completions'>
  reasoningModel: Model<'openai-completions'>
  embeddingConfig: EmbeddingConfig | null
} {
  const apiKey = setting.providers?.openaiApiKey ?? ''
  const baseUrl =
    setting.providers?.openaiBaseUrl ?? 'https://api.openai.com/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'
  const embeddingModelId = setting.providerConfig?.embeddingModel ?? ''

  const makeModel = (id: string): Model<'openai-completions'> => ({
    id,
    name: id,
    api: 'openai-completions',
    provider: 'openai',
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 16384
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId),
    embeddingConfig: embeddingModelId
      ? { apiKey, model: embeddingModelId, baseUrl }
      : null
  }
}
