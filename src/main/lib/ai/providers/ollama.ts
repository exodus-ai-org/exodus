import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModel } from 'ai'
import { createOllama, OllamaProvider } from 'ai-sdk-ollama'

export function getOllama(setting: Setting): {
  provider: OllamaProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
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
