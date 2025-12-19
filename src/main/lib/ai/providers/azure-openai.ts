import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getAzureOpenAi(setting: Setting): {
  provider: AzureOpenAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const azure = createAzure({
    apiKey: setting.providers?.azureOpenaiApiKey ?? '',
    baseURL: setting.providers?.azureOpenAiEndpoint ?? '',
    apiVersion: setting.providers?.azureOpenAiApiVersion ?? ''
  })

  return {
    provider: azure,
    chatModel: azure(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: azure(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: azure.textEmbeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
