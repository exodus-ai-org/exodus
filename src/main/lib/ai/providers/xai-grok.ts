import { createXai } from '@ai-sdk/xai'
import { Settings } from '@shared/types/db'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'

export function getXaiGrok(settings: Settings) {
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
    })
  }
}
