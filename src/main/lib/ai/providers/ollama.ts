import type { Model } from '@earendil-works/pi-ai'

import type { Settings } from '../../db/schema'
import { OLLAMA_PROVIDER_ID } from '../kernel/models'

export function getOllama(setting: Settings): Model<string> {
  const baseUrl =
    setting.providers?.ollamaBaseUrl ?? 'http://localhost:11434/v1'
  const id = setting.providerConfig?.model ?? ''

  return {
    id,
    name: id,
    api: 'openai-completions',
    // Routed to the kernel's dynamic `ollama` provider (an OpenAI-compatible
    // completions API at the base URL below); the `openai` provider in pi
    // 0.85 only serves the Responses API.
    provider: OLLAMA_PROVIDER_ID,
    baseUrl,
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192
  }
}
