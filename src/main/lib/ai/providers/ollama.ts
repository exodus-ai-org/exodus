import type { Model } from '@mariozechner/pi-ai'

import type { Settings } from '../../db/schema'

export function getOllama(setting: Settings): Model<string> {
  const baseUrl =
    setting.providers?.ollamaBaseUrl ?? 'http://localhost:11434/v1'
  const id = setting.providerConfig?.model ?? ''

  return {
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
  }
}
