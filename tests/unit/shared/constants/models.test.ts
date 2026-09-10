import { isCurrentModel, models } from '@shared/constants/models'
import { AiProviders } from '@shared/types/ai'
import { describe, expect, it } from 'vitest'

describe('isCurrentModel', () => {
  it('accepts an id that is in the provider/role list', () => {
    const id = models[AiProviders.OpenAiGpt].chatModel[0]
    expect(isCurrentModel(AiProviders.OpenAiGpt, 'chatModel', id)).toBe(true)
  })

  it('rejects an id that has been dropped from the list', () => {
    expect(
      isCurrentModel(AiProviders.OpenAiGpt, 'chatModel', 'gpt-5.5-pro')
    ).toBe(false)
  })

  it('treats an empty or missing selection as current', () => {
    expect(isCurrentModel(AiProviders.OpenAiGpt, 'chatModel', '')).toBe(true)
    expect(isCurrentModel(AiProviders.OpenAiGpt, 'chatModel', null)).toBe(true)
    expect(isCurrentModel(AiProviders.OpenAiGpt, 'chatModel', undefined)).toBe(
      true
    )
  })

  it('accepts any id for a free-form provider (Ollama has no list)', () => {
    expect(
      isCurrentModel(AiProviders.Ollama, 'chatModel', 'llama3.1:70b-custom')
    ).toBe(true)
  })

  it('checks the chat and reasoning lists independently', () => {
    // A chat-only id is stale when asked about as a reasoning model.
    const chatOnly = models[AiProviders.AnthropicClaude].chatModel.find(
      (m) => !models[AiProviders.AnthropicClaude].reasoningModel.includes(m)
    )
    expect(chatOnly).toBeTruthy()
    expect(
      isCurrentModel(AiProviders.AnthropicClaude, 'chatModel', chatOnly!)
    ).toBe(true)
    expect(
      isCurrentModel(AiProviders.AnthropicClaude, 'reasoningModel', chatOnly!)
    ).toBe(false)
  })
})
