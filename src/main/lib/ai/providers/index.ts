import type { Api, KnownProvider, Model } from '@mariozechner/pi-ai'
import { AiProviders } from '@shared/types/ai'
import type { Settings } from '@shared/types/db'

import { getOllama } from './ollama'
import { resolveModel } from './resolve-model'

export type ProviderResult = {
  chatModel: Model<string>
  reasoningModel: Model<string>
}

export type ProviderFn = (setting: Settings) => ProviderResult

/**
 * The registry-backed providers all resolve a model the same way — they differ
 * only in which base-URL setting to read (and its fallback), the default model
 * ids, and the pi-ai `provider` / `api` strings. This table captures those
 * differences; `fromSpec` turns each row into a `ProviderFn`.
 *
 * Ollama is the exception (a hand-built `Model`, nothing in the registry) and
 * keeps its own module.
 */
interface ProviderSpec {
  provider: KnownProvider
  api: Api
  baseUrl: (setting: Settings) => string
  defaultChatModel: string
  defaultReasoningModel: string
}

const SPECS: Record<Exclude<AiProviders, AiProviders.Ollama>, ProviderSpec> = {
  [AiProviders.OpenAiGpt]: {
    provider: 'openai',
    api: 'openai-completions',
    baseUrl: (s) => s.providers?.openaiBaseUrl ?? 'https://api.openai.com/v1',
    defaultChatModel: 'gpt-5.6',
    defaultReasoningModel: 'gpt-6-astra'
  },
  [AiProviders.AzureOpenAi]: {
    provider: 'azure-openai-responses',
    api: 'azure-openai-responses',
    baseUrl: (s) => s.providers?.azureOpenAiEndpoint ?? '',
    defaultChatModel: 'gpt-5.6',
    defaultReasoningModel: 'gpt-6-astra'
  },
  [AiProviders.AnthropicClaude]: {
    provider: 'anthropic',
    api: 'anthropic-messages',
    baseUrl: (s) =>
      s.providers?.anthropicBaseUrl ?? 'https://api.anthropic.com',
    defaultChatModel: 'claude-opus-5',
    defaultReasoningModel: 'claude-opus-5'
  },
  [AiProviders.GoogleGemini]: {
    provider: 'google',
    api: 'google-generative-ai',
    baseUrl: (s) =>
      s.providers?.googleGeminiBaseUrl ??
      'https://generativelanguage.googleapis.com/v1beta',
    defaultChatModel: 'gemini-3.1-pro-preview',
    defaultReasoningModel: 'gemini-3.1-pro-preview'
  },
  [AiProviders.XaiGrok]: {
    provider: 'xai',
    api: 'openai-completions',
    baseUrl: (s) => s.providers?.xAiBaseUrl ?? 'https://api.x.ai/v1',
    defaultChatModel: 'grok-4.6',
    defaultReasoningModel: 'grok-4.6'
  }
}

function fromSpec(spec: ProviderSpec): ProviderFn {
  return (setting) => {
    const baseUrl = spec.baseUrl(setting)
    const chatId = setting.providerConfig?.chatModel ?? spec.defaultChatModel
    const reasoningId =
      setting.providerConfig?.reasoningModel ?? spec.defaultReasoningModel
    return {
      chatModel: resolveModel(spec.provider, chatId, baseUrl, spec.api),
      reasoningModel: resolveModel(
        spec.provider,
        reasoningId,
        baseUrl,
        spec.api
      )
    }
  }
}

export const providers: Record<AiProviders, ProviderFn> = {
  [AiProviders.Ollama]: getOllama,
  [AiProviders.OpenAiGpt]: fromSpec(SPECS[AiProviders.OpenAiGpt]),
  [AiProviders.AzureOpenAi]: fromSpec(SPECS[AiProviders.AzureOpenAi]),
  [AiProviders.AnthropicClaude]: fromSpec(SPECS[AiProviders.AnthropicClaude]),
  [AiProviders.GoogleGemini]: fromSpec(SPECS[AiProviders.GoogleGemini]),
  [AiProviders.XaiGrok]: fromSpec(SPECS[AiProviders.XaiGrok])
}
