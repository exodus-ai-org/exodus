import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'
import { createOllama, OllamaProvider } from 'ollama-ai-provider'

export function getOllama(setting: Setting): {
  provider: OllamaProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const ollama = createOllama({
    baseURL: setting.providers?.ollamaBaseUrl ?? ''
  })

  return {
    provider: ollama,
    chatModel: ollama(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: ollama(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: null
  }
}
