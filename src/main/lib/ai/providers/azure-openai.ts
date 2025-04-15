import { createAzure } from '@ai-sdk/azure'
import { Setting } from '@shared/types/db'

export async function getAzureOpenAi(setting: Setting) {
  const azure = createAzure({
    apiKey: setting.azureOpenaiApiKey ?? '',
    baseURL: setting.azureOpenAiEndpoint ?? '',
    apiVersion: setting.azureOpenAiApiVersion ?? ''
  })

  return {
    chatModel: azure(setting.chatModel ?? ''),
    reasoningModel: azure(setting.reasoningModel ?? '')
  }
}
