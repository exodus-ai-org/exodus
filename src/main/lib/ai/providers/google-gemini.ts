import type { Model } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getGoogleGemini(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.googleGeminiBaseUrl ??
    'https://generativelanguage.googleapis.com/v1beta'
  const chatModelId =
    setting.providerConfig?.chatModel ?? 'gemini-3.1-pro-preview'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gemini-3.1-pro-preview'

  return {
    chatModel: resolveModel(
      'google',
      chatModelId,
      baseUrl,
      'google-generative-ai'
    ),
    reasoningModel: resolveModel(
      'google',
      reasoningModelId,
      baseUrl,
      'google-generative-ai'
    )
  }
}
