/**
 * Inject API keys from .env.test into the running app's settings.
 *
 * Provider enum values (from AiProviders):
 *   'OpenAI GPT' | 'Anthropic Claude' | 'Google Gemini' | 'xAI Grok' | 'Azure OpenAI' | 'Ollama'
 */
import { ApiClient } from '../fixtures/api-client'

export async function injectApiKeys(api: ApiClient) {
  await api.updateSettings({
    providers: {
      openaiApiKey: process.env.OPENAI_API_KEY ?? null,
      anthropicApiKey: process.env.CLAUDE_API_KEY ?? null,
      googleGeminiApiKey: process.env.GOOGLE_CLOUD ?? null
    },
    webSearch: {
      perplexityApiKey: process.env.PERPLEXITY_API_KEY ?? null
    }
  })
}

export async function injectOpenAiProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'OpenAI GPT',
      chatModel: 'gpt-4.1-mini',
      reasoningModel: 'o4-mini'
    }
  })
}

export async function injectClaudeProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'Anthropic Claude',
      chatModel: 'claude-sonnet-4-20250514',
      reasoningModel: 'claude-sonnet-4-20250514'
    }
  })
}

export async function injectGeminiProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'Google Gemini',
      chatModel: 'gemini-2.5-flash',
      reasoningModel: 'gemini-2.5-flash'
    }
  })
}
