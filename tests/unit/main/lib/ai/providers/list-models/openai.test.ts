import { listOpenAiModels } from '@main/lib/ai/providers/list-models/openai'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('listOpenAiModels', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fills every field from MODEL_METADATA_FALLBACK for a known id', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              data: [{ id: 'gpt-5.6', created: 1, owned_by: 'openai' }]
            }),
            { status: 200 }
          )
        )
    )
    const models = await listOpenAiModels({ apiKey: 'sk-test' })
    expect(models).toEqual([
      {
        id: 'gpt-5.6',
        displayName: 'gpt-5.6', // OpenAI's API has no display name — use the id
        snapshot: {
          contextWindow: 1_050_000,
          maxOutputTokens: 128_000,
          reasoningLevels: ['off', 'low', 'medium', 'high', 'xhigh'],
          cost: { input: 4, output: 20 }
        }
      }
    ])
  })

  it('never throws for an id with no fallback entry — everything nulls/empties', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: 'some-brand-new-model', created: 1, owned_by: 'openai' }
            ]
          }),
          { status: 200 }
        )
      )
    )
    const models = await listOpenAiModels({ apiKey: 'sk-test' })
    expect(models[0].snapshot).toEqual({
      contextWindow: null,
      maxOutputTokens: null,
      reasoningLevels: [],
      cost: null
    })
  })
})
