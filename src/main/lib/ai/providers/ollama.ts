import type { Model } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

export function getOllama(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl =
    setting.providers?.ollamaBaseUrl ?? 'http://localhost:11434/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? ''
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? ''

  const makeModel = (id: string): Model<string> => ({
    id,
    name: id,
    api: 'openai-completions',
    provider: 'openai',
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192
  })

  return {
    chatModel: makeModel(chatModelId),
    reasoningModel: makeModel(reasoningModelId)
  }
}
