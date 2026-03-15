import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

export function getXaiGrok(setting: Setting): {
  chatModel: Model<'openai-completions'>
  reasoningModel: Model<'openai-completions'>
  embeddingConfig: EmbeddingConfig | null
} {
  const baseUrl = setting.providers?.xAiBaseUrl ?? 'https://api.x.ai/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'grok-2'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'grok-2'

  const makeModel = (id: string): Model<'openai-completions'> => ({
    id,
    name: id,
    api: 'openai-completions',
    provider: 'xai',
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 131072,
    maxTokens: 16384
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId),
    embeddingConfig: null
  }
}
