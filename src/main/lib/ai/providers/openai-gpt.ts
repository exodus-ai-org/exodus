import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModelV1 } from 'ai'

export function getOpenAi(setting: Setting): {
  provider: OpenAIProvider
  chatModel: LanguageModelV1
  reasoningModel: LanguageModelV1
  embeddingModel: EmbeddingModel<string> | null
} {
  const openai = createOpenAI({
    apiKey: setting.providers?.openaiApiKey ?? '',
    baseURL: setting.providers?.openaiBaseUrl || undefined
  })

  return {
    provider: openai,
    chatModel: openai(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: openai(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: openai.textEmbeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
