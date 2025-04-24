import { createOpenAI } from '@ai-sdk/openai'
import { Settings } from '@shared/types/db'

export function getOpenAi(settings: Settings) {
  const openai = createOpenAI({
    apiKey: settings.providers?.openaiApiKey ?? '',
    baseURL: settings.providers?.openaiBaseUrl ?? undefined
  })

  return {
    provider: openai,
    chatModel: openai(settings.providerConfig?.chatModel ?? ''),
    reasoningModel: openai(settings.providerConfig?.reasoningModel ?? '')
  }
}
