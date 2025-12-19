import { createXai, XaiProvider } from '@ai-sdk/xai'
import { Setting } from '@shared/types/db'
import {
  EmbeddingModel,
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel
} from 'ai'

export function getXaiGrok(setting: Setting): {
  provider: XaiProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const xai = createXai({
    apiKey: setting.providers?.xAiApiKey ?? '',
    baseURL: setting.providers?.xAiBaseUrl ?? undefined
  })

  return {
    provider: xai,
    chatModel: xai(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: wrapLanguageModel({
      model: xai(setting.providerConfig?.reasoningModel ?? ''),
      middleware: extractReasoningMiddleware({ tagName: 'think' })
    }),
    embeddingModel: null
  }
}
