import { createAzure } from '@ai-sdk/azure'
import { Setting } from '@shared/types/db'

export async function getAzureOpenAi(setting: Setting) {
  return createAzure({
    apiKey: setting.azureOpenaiApiKey ?? '',
    baseURL: setting.azureOpenAiEndpoint ?? '',
    apiVersion: setting.azureOpenAiApiVersion ?? ''
  })
}
