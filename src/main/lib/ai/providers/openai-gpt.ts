import type { Api, Model } from '@mariozechner/pi-ai'
import { getModel } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

export interface EmbeddingConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

function resolveModel(
  provider: string,
  id: string,
  baseUrl: string,
  api: Api
): Model<string> {
  try {
    const registered = getModel(provider, id)
    // Override baseUrl if user configured a custom one
    return baseUrl !== registered.baseUrl
      ? { ...registered, baseUrl }
      : registered
  } catch {
    // Model not in registry, construct manually
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

export function getOpenAi(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
  embeddingConfig: EmbeddingConfig | null
} {
  const apiKey = setting.providers?.openaiApiKey ?? ''
  const baseUrl =
    setting.providers?.openaiBaseUrl ?? 'https://api.openai.com/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'
  const embeddingModelId = setting.providerConfig?.embeddingModel ?? ''

  return {
    chatModel: resolveModel(
      'openai',
      chatModelId,
      baseUrl,
      'openai-completions'
    ),
    reasoningModel: resolveModel(
      'openai',
      reasoningModelId,
      baseUrl,
      'openai-completions'
    ),
    embeddingConfig: embeddingModelId
      ? { apiKey, model: embeddingModelId, baseUrl }
      : null
  }
}
