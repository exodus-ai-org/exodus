import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

export function getOllama(setting: Setting): {
  chatModel: Model<'openai-completions'>
  reasoningModel: Model<'openai-completions'>
  embeddingConfig: EmbeddingConfig | null
} {
  const baseUrl =
    setting.providers?.ollamaBaseUrl ?? 'http://localhost:11434/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? ''
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? ''
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
    maxTokens: 8192
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId),
    embeddingConfig: embeddingModelId
      ? { apiKey: 'ollama', model: embeddingModelId, baseUrl }
      : null
  }
}
