import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getGoogleGemini(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.googleGeminiBaseUrl ??
    'https://generativelanguage.googleapis.com/v1beta'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gemini-2.0-flash'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gemini-2.0-flash'

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
