import { createXai } from '@ai-sdk/xai'
import { Setting } from '@shared/types/db'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'

export function getXaiGrok(setting: Setting) {
  const xai = createXai({
    apiKey: setting.xAiApiKey ?? '',
    baseURL: setting.xAiBaseUrl ?? undefined
  })

  return {
    provider: xai,
    chatModel: xai(setting.chatModel ?? ''),
    reasoningModel: wrapLanguageModel({
      model: xai(setting.reasoningModel ?? ''),
      middleware: extractReasoningMiddleware({ tagName: 'think' })
    })
  }
}
