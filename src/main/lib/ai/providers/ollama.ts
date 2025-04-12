import { Setting } from '@shared/types/db'
import { createOllama } from 'ollama-ai-provider'

export async function getOllama(setting: Setting) {
  return createOllama({
    baseURL: setting.ollamaBaseUrl ?? ''
  })
}
