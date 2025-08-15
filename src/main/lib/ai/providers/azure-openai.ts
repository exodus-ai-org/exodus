import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure'
import { Settings } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getAzureOpenAi(settings: Settings): {
  provider: AzureOpenAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const azure = createAzure({
    apiKey: settings.providers?.azureOpenaiApiKey ?? '',
    baseURL: settings.providers?.azureOpenAiEndpoint ?? '',
    apiVersion: settings.providers?.azureOpenAiApiVersion ?? ''
  })

  return {
    provider: azure,
    chatModel: azure(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: azure(settings.providerConfig?.reasoningModel ?? ''),
    embeddingModel: azure.textEmbeddingModel(
      settings.providerConfig?.embeddingModel ?? ''
    )
  }
}
