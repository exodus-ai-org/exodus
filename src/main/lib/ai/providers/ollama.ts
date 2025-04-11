import { createOllama } from 'ollama-ai-provider'
import { Setting } from '../../db/schema'

export async function getOllama(setting: Setting) {
  return createOllama({
    baseURL: setting.ollamaBaseUrl ?? ''
  })
}
