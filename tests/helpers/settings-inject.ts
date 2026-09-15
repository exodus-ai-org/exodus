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
      braveApiKey: process.env.BRAVE_API_KEY ?? null
    }
  })
}

export async function injectOpenAiProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'OpenAI GPT',
      // The old chatModel/reasoningModel pair diverged on purpose here
      // (chatModel 'gpt-4.1-mini' vs reasoningModel 'o4-mini') because
      // openai.spec.ts's "reasoning mode (o4-mini)" test needs a model that
      // genuinely supports reasoning on OpenAI's real API — gpt-4.1-mini
      // doesn't. There's only one `model` field now, so it wins for the
      // whole provider config; the modelSnapshot below keeps our own
      // resolveModel() from clamping the requested reasoning effort away.
      model: 'o4-mini',
      modelSnapshot: {
        reasoningLevels: ['off', 'low', 'medium', 'high']
      }
    }
  })
}

export async function injectClaudeProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'Anthropic Claude',
      model: 'claude-sonnet-4-20250514'
    }
  })
}

export async function injectGeminiProvider(api: ApiClient) {
  await injectApiKeys(api)
  await api.updateSettings({
    providerConfig: {
      provider: 'Google Gemini',
      model: 'gemini-2.5-flash'
    }
  })
}
