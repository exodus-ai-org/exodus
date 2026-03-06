import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModel } from 'ai'

export function getAzureOpenAi(setting: Setting): {
  provider: AzureOpenAIProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
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
    embeddingModel: azure.embeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
