import type { Model } from '@mariozechner/pi-ai'
import { AiProviders } from '@shared/types/ai'
import type { Settings } from '@shared/types/db'

import { getAnthropicClaude } from './anthropic-claude'
import { getAzureOpenAi } from './azure-openai'
import { getGoogleGemini } from './google-gemini'
import { getOllama } from './ollama'
import { getOpenAi } from './openai-gpt'
import { getXaiGrok } from './xai-grok'

export type ProviderResult = {
  chatModel: Model<string>
  reasoningModel: Model<string>
}

export type ProviderFn = (setting: Settings) => ProviderResult

export const providers: Record<AiProviders, ProviderFn> = {
  [AiProviders.AnthropicClaude]: getAnthropicClaude,
  [AiProviders.AzureOpenAi]: getAzureOpenAi,
  [AiProviders.GoogleGemini]: getGoogleGemini,
  [AiProviders.Ollama]: getOllama,
  [AiProviders.OpenAiGpt]: getOpenAi,
  [AiProviders.XaiGrok]: getXaiGrok
}
