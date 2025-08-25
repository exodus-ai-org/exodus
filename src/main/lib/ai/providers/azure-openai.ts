import { type AzureOpenAIProvider, createAzure } from '@ai-sdk/azure'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { Settings } from '@shared/types/db'
import type { EmbeddingModel } from 'ai'

export function getAzureOpenAi(settings: Settings): {
  provider: AzureOpenAIProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
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
