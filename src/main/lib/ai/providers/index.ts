import { AiProviders } from '@shared/types/ai'
import { getAnthropicClaude } from './anthropic-claude'
import { getAzureOpenAi } from './azure-openai'
import { getGoogleGemini } from './google-gemini'
import { getOllama } from './ollama'
import { getOpenAi } from './openai-gpt'
import { getXaiGrok } from './xai-grok'

export type { EmbeddingConfig } from './openai-gpt'

export const providers = {
  [AiProviders.AnthropicClaude]: getAnthropicClaude,
  [AiProviders.AzureOpenAi]: getAzureOpenAi,
  [AiProviders.GoogleGemini]: getGoogleGemini,
  [AiProviders.Ollama]: getOllama,
  [AiProviders.OpenAiGpt]: getOpenAi,
  [AiProviders.XaiGrok]: getXaiGrok
}
