import { Settings } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'
import { createOllama, OllamaProvider } from 'ollama-ai-provider'

export function getOllama(settings: Settings): {
  provider: OllamaProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const ollama = createOllama({
    baseURL: settings.providers?.ollamaBaseUrl ?? ''
  })

  return {
    provider: ollama,
    chatModel: ollama(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: ollama(settings.providerConfig?.reasoningModel ?? ''),
    embeddingModel: null
  }
}
