import { listXaiModels } from '@main/lib/ai/providers/list-models/xai'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('listXaiModels', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes context_length and converts per-token price to per-million', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'grok-4.6',
                context_length: 500_000,
                prompt_text_token_price: 0.000002,
                completion_text_token_price: 0.000006
              }
            ]
          }),
          { status: 200 }
        )
      )
    )
    const models = await listXaiModels({ apiKey: 'xai-key' })
    expect(models).toEqual([
      {
        id: 'grok-4.6',
        displayName: 'grok-4.6',
        snapshot: {
          contextWindow: 500_000,
          maxOutputTokens: null,
          reasoningLevels: [], // from MODEL_METADATA_FALLBACK
          cost: { input: 2, output: 6 }
        }
      }
    ])
  })
})
