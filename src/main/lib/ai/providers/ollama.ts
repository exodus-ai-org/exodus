import type { LanguageModelV2 } from '@ai-sdk/provider'
import type { Settings } from '@shared/types/db'
import type { EmbeddingModel } from 'ai'
import { createOllama, type OllamaProvider } from 'ollama-ai-provider'

export function getOllama(settings: Settings): {
  provider: OllamaProvider
  chatModel: LanguageModelV2
  reasoningModel: LanguageModelV2
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
