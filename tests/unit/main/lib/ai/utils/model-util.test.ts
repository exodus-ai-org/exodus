import { getStaleModelSelections } from '@main/lib/ai/utils/model-util'
import type { Settings } from '@main/lib/db/schema'
import { models } from '@shared/constants/models'
import { AiProviders } from '@shared/types/ai'
import { describe, expect, it } from 'vitest'

function settings(
  providerConfig: Partial<Settings['providerConfig']>
): Settings {
  return { providerConfig } as unknown as Settings
}

describe('getStaleModelSelections', () => {
  it('returns nothing when no provider is selected', () => {
    expect(getStaleModelSelections(settings({}))).toEqual([])
  })

  it('returns nothing when both saved models are current', () => {
    const s = settings({
      provider: AiProviders.OpenAiGpt,
      chatModel: models[AiProviders.OpenAiGpt].chatModel[0],
      reasoningModel: models[AiProviders.OpenAiGpt].reasoningModel[0]
    })
    expect(getStaleModelSelections(s)).toEqual([])
  })

  it('flags a chat model that dropped off the lineup', () => {
    const s = settings({
      provider: AiProviders.OpenAiGpt,
      chatModel: 'gpt-5.5-pro',
      reasoningModel: models[AiProviders.OpenAiGpt].reasoningModel[0]
    })
    expect(getStaleModelSelections(s)).toEqual([
      { role: 'chatModel', id: 'gpt-5.5-pro' }
    ])
  })

  it('flags both chat and reasoning when both are stale', () => {
    const s = settings({
      provider: AiProviders.XaiGrok,
      chatModel: 'grok-2',
      reasoningModel: 'grok-2'
    })
    expect(getStaleModelSelections(s)).toEqual([
      { role: 'chatModel', id: 'grok-2' },
      { role: 'reasoningModel', id: 'grok-2' }
    ])
  })

  it('never flags a free-form provider (Ollama)', () => {
    const s = settings({
      provider: AiProviders.Ollama,
      chatModel: 'anything:local',
      reasoningModel: 'anything:local'
    })
    expect(getStaleModelSelections(s)).toEqual([])
  })
})
