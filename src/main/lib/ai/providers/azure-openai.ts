import { createAzure } from '@ai-sdk/azure'
import { Setting } from '../../db/schema'

export async function getAzureOpenAi(setting: Setting) {
  return createAzure({
    apiKey: setting.azureOpenaiApiKey ?? '',
    baseURL: setting.azureOpenAiEndpoint ?? '',
    apiVersion: setting.azureOpenAiApiVersion ?? ''
  })
}
