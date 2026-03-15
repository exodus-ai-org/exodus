import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

export function getAzureOpenAi(setting: Setting): {
  chatModel: Model<'azure-openai-responses'>
  reasoningModel: Model<'azure-openai-responses'>
  embeddingConfig: EmbeddingConfig | null
} {
  const apiKey = setting.providers?.azureOpenaiApiKey ?? ''
  const baseUrl = setting.providers?.azureOpenAiEndpoint ?? ''
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'
  const embeddingModelId = setting.providerConfig?.embeddingModel ?? ''

  const makeModel = (id: string): Model<'azure-openai-responses'> => ({
    id,
    name: id,
    api: 'azure-openai-responses',
    provider: 'azure-openai-responses',
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
