import { Providers } from '@shared/types/ai'
import { getAnthropicClaude } from './anthropic-claude'
import { getAzureOpenAi } from './azure-openai'
import { getGoogleGemini } from './google-gemini'
import { getOllama } from './ollama'
import { getOpenAi } from './openai-gpt'
import { getXaiGrok } from './xai-grok'

export const providers = {
  [Providers.AnthropicClaude]: getAnthropicClaude,
  [Providers.AzureOpenAi]: getAzureOpenAi,
  [Providers.GoogleGemini]: getGoogleGemini,
  [Providers.Ollama]: getOllama,
  [Providers.OpenAiGpt]: getOpenAi,
  [Providers.XaiGrok]: getXaiGrok
}
