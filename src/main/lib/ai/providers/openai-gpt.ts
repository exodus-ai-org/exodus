import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { Setting } from '@shared/types/db'
import { EmbeddingModel, LanguageModel } from 'ai'

export function getOpenAi(setting: Setting): {
  provider: OpenAIProvider
  chatModel: LanguageModel
  reasoningModel: LanguageModel
  embeddingModel: EmbeddingModel | null
} {
  const openai = createOpenAI({
    apiKey: setting.providers?.openaiApiKey ?? '',
    baseURL: setting.providers?.openaiBaseUrl || undefined
  })

  return {
    provider: openai,
    chatModel: openai(setting.providerConfig?.chatModel ?? ''),
    reasoningModel: openai(setting.providerConfig?.reasoningModel ?? ''),
    embeddingModel: openai.embeddingModel(
      setting.providerConfig?.embeddingModel ?? ''
    )
  }
}
