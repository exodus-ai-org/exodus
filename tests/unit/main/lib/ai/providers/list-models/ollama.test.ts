import { listOllamaModels } from '@main/lib/ai/providers/list-models/ollama'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('listOllamaModels', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists local model names with no metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [{ name: 'llama3.1:70b' }, { name: 'mistral:7b' }]
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const models = await listOllamaModels({
      apiKey: '',
      baseUrl: 'http://localhost:11434'
    })

    expect(models).toEqual([
      {
        id: 'llama3.1:70b',
        displayName: 'llama3.1:70b',
        snapshot: {
          contextWindow: null,
          maxOutputTokens: null,
          reasoningLevels: [],
          cost: null
        }
      },
      {
        id: 'mistral:7b',
        displayName: 'mistral:7b',
        snapshot: {
          contextWindow: null,
          maxOutputTokens: null,
          reasoningLevels: [],
          cost: null
        }
      }
    ])
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags')
  })

  it("strips a trailing /v1 (chat's baseUrl convention) before requesting /api/tags", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ models: [] }), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchMock)

    await listOllamaModels({
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1'
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags')
  })

  it('strips a trailing /v1/ (with slash) too', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ models: [] }), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchMock)

    await listOllamaModels({
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1/'
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags')
  })

  it('defaults to http://localhost:11434/api/tags when baseUrl is unset', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ models: [] }), { status: 200 })
      )
    vi.stubGlobal('fetch', fetchMock)

    await listOllamaModels({ apiKey: '', baseUrl: null })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags')
  })
})
