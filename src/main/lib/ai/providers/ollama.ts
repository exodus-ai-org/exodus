import { Settings } from '@shared/types/db'
import { createOllama } from 'ollama-ai-provider'

export function getOllama(settings: Settings) {
  const ollama = createOllama({
    baseURL: settings.providers?.ollamaBaseUrl ?? ''
  })

  return {
    provider: ollama,
    chatModel: ollama(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: ollama(settings.providerConfig?.reasoningModel ?? '')
  }
}
