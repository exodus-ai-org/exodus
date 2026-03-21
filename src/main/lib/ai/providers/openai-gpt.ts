import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import { resolveModel } from './resolve-model'

export function getOpenAi(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.openaiBaseUrl ?? 'https://api.openai.com/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'

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
