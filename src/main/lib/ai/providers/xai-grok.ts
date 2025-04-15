import { createXai } from '@ai-sdk/xai'
import { Setting } from '@shared/types/db'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'

export async function getXaiGrok(setting: Setting) {
  const xai = createXai({
    apiKey: setting.xAiApiKey ?? '',
    baseURL: setting.xAiBaseUrl ?? undefined
  })

  return {
    chatModel: xai(setting.chatModel ?? ''),
    reasoningModel: wrapLanguageModel({
      model: xai(setting.reasoningModel ?? ''),
      middleware: extractReasoningMiddleware({ tagName: 'think' })
    })
  }
}
