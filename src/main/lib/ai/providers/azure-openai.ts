import type { Api, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

function resolveModel(
  provider: string,
  id: string,
  baseUrl: string,
  api: Api
): Model<string> {
  try {
    const registered = getModel(provider, id)
    return baseUrl !== registered.baseUrl
      ? { ...registered, baseUrl }
      : registered
  } catch {
    return {
      id,
      name: id,
      api,
      provider,
      baseUrl,
      reasoning: false,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 16384
    }
  }
}

export function getAzureOpenAi(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
  embeddingConfig: EmbeddingConfig | null
} {
  const apiKey = setting.providers?.azureOpenaiApiKey ?? ''
  const baseUrl = setting.providers?.azureOpenAiEndpoint ?? ''
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'
  const embeddingModelId = setting.providerConfig?.embeddingModel ?? ''

  return {
    chatModel: resolveModel(
      'azure-openai-responses',
      chatModelId,
      baseUrl,
      'azure-openai-responses'
    ),
    reasoningModel: resolveModel(
      'azure-openai-responses',
      reasoningModelId,
      baseUrl,
      'azure-openai-responses'
    ),
    embeddingConfig: embeddingModelId
      ? { apiKey, model: embeddingModelId, baseUrl }
      : null
  }
}
