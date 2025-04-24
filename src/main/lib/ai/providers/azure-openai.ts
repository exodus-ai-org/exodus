import { createAzure } from '@ai-sdk/azure'
import { Settings } from '@shared/types/db'

export function getAzureOpenAi(settings: Settings) {
  const azure = createAzure({
    apiKey: settings.providers?.azureOpenaiApiKey ?? '',
    baseURL: settings.providers?.azureOpenAiEndpoint ?? '',
    apiVersion: settings.providers?.azureOpenAiApiVersion ?? ''
  })

  return {
    provider: azure,
    chatModel: azure(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: azure(settings.providerConfig?.reasoningModel ?? '')
  }
}
