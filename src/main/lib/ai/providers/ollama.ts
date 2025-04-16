import { Setting } from '@shared/types/db'
import { createOllama } from 'ollama-ai-provider'

export function getOllama(setting: Setting) {
  const ollama = createOllama({
    baseURL: setting.ollamaBaseUrl ?? ''
  })

  return {
    provider: ollama,
    chatModel: ollama(setting.chatModel ?? ''),
    reasoningModel: ollama(setting.reasoningModel ?? '')
  }
}
