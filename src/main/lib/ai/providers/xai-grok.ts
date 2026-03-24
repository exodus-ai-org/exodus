import type { Model } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { resolveModel } from './resolve-model'

export function getXaiGrok(setting: Settings): {
  chatModel: Model<string>
  reasoningModel: Model<string>
} {
  const baseUrl = setting.providers?.xAiBaseUrl ?? 'https://api.x.ai/v1'
  const chatModelId = setting.providerConfig?.chatModel ?? 'grok-2'
  const reasoningModelId = setting.providerConfig?.reasoningModel ?? 'grok-2'

  return {
    chatModel: resolveModel('xai', chatModelId, baseUrl, 'openai-completions'),
    reasoningModel: resolveModel(
      'xai',
      reasoningModelId,
      baseUrl,
      'openai-completions'
    )
  }
}
