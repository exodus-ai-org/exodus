import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import type { EmbeddingConfig } from './openai-gpt'

export function getGoogleGemini(setting: Setting): {
  chatModel: Model<'google-generative-ai'>
  reasoningModel: Model<'google-generative-ai'>
  embeddingConfig: EmbeddingConfig | null
} {
  const apiKey = setting.providers?.googleGeminiApiKey ?? ''
  const baseUrl =
    setting.providers?.googleGeminiBaseUrl ??
    'https://generativelanguage.googleapis.com/v1beta'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gemini-2.0-flash'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gemini-2.0-flash'
  const embeddingModelId = setting.providerConfig?.embeddingModel ?? ''

  const makeModel = (id: string): Model<'google-generative-ai'> => ({
    id,
    name: id,
    api: 'google-generative-ai',
    provider: 'google',
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1000000,
    maxTokens: 8192
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId),
    embeddingConfig: embeddingModelId
      ? { apiKey, model: embeddingModelId, baseUrl }
      : null
  }
}
