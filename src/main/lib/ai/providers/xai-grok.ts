import { createXai, XaiProvider } from '@ai-sdk/xai'
import { Setting } from '@shared/types/db'
import {
  EmbeddingModel,
  extractReasoningMiddleware,
  LanguageModel,
  wrapLanguageModel
} from 'ai'

export function getXaiGrok(setting: Setting): {
  provider: XaiProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
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
