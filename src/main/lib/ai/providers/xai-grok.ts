import { createXai, XaiProvider } from '@ai-sdk/xai'
import { Settings } from '@shared/types/db'
import {
  EmbeddingModel,
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel
} from 'ai'

export function getXaiGrok(settings: Settings): {
  provider: XaiProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const xai = createXai({
    apiKey: settings.providers?.xAiApiKey ?? '',
    baseURL: settings.providers?.xAiBaseUrl ?? undefined
  })

  return {
    provider: xai,
    chatModel: xai(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: wrapLanguageModel({
      model: xai(settings.providerConfig?.reasoningModel ?? ''),
      middleware: extractReasoningMiddleware({ tagName: 'think' })
    }),
    embeddingModel: null
  }
}
