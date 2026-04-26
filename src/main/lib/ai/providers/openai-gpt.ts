import type { Model } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getOpenAi(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.openaiBaseUrl ?? 'https://api.openai.com/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-5.5'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gpt-5.5-pro'

  return {
    chatModel: resolveModel(
      'openai',
      chatModelId,
      baseUrl,
      'openai-completions'
    ),
    reasoningModel: resolveModel(
      'openai',
      reasoningModelId,
      baseUrl,
      'openai-completions'
    )
  }
}
