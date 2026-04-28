import type { Model } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getAzureOpenAi(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl = setting.providers?.azureOpenAiEndpoint ?? ''
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-5.5'
  const reasoningModelId =
    setting.providerConfig?.reasoningModel ?? 'gpt-5.5-pro'

  return {
    chatModel: resolveModel(
      'azure-openai-responses',
      chatModelId,
      baseUrl,
      'azure-openai-responses'
    ),
    reasoningModel: resolveModel(
      'azure-openai-responses',
      reasoningModelId,
      baseUrl,
      'azure-openai-responses'
    )
  }
}
