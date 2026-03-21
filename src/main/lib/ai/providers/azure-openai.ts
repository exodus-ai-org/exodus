import type { Model } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import { resolveModel } from './resolve-model'

export function getAzureOpenAi(setting: Setting): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl = setting.providers?.azureOpenAiEndpoint ?? ''
  const chatModelId = setting.providerConfig?.chatModel ?? 'gpt-4o'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'o1'

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
