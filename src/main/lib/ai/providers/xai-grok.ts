import type { LanguageModelV2 } from '@ai-sdk/provider'
import { createXai, type XaiProvider } from '@ai-sdk/xai'
import type { Settings } from '@shared/types/db'
import {
  type EmbeddingModel,
  extractReasoningMiddleware,
  wrapLanguageModel
} from 'ai'

export function getXaiGrok(settings: Settings): {
  provider: XaiProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
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
