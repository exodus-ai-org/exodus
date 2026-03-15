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
      contextWindow: 131072,
      maxTokens: 16384
    }
  }
}

export function getXaiGrok(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
  embeddingConfig: EmbeddingConfig | null
} {
  const baseUrl = setting.providers?.xAiBaseUrl ?? 'https://api.x.ai/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'grok-2'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'grok-2'

  return {
    chatModel: resolveModel('xai', chatModelId, baseUrl, 'openai-completions'),
    reasoningModel: resolveModel(
      'xai',
      reasoningModelId,
      baseUrl,
      'openai-completions'
    ),
    embeddingConfig: null
  }
}
