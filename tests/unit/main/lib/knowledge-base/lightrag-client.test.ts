import { LightRagError } from '@main/lib/knowledge-base/errors'
import { LightRagClient } from '@main/lib/knowledge-base/lightrag-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
afterEach(() => fetchMock.mockReset())

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response
}

describe('LightRagClient', () => {
  it('insertText posts to /documents/text with the file_source and maps track_id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ track_id: 'txt_1' }))
    const c = new LightRagClient('http://localhost:9621', 'k')
    const res = await c.insertText('# T\n\nbody', 'doc-42')

    expect(res).toEqual({ trackId: 'txt_1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:9621/documents/text')
    expect(init.method).toBe('POST')
    expect(init.headers['X-API-Key']).toBe('k')
    expect(JSON.parse(init.body)).toEqual({
      text: '# T\n\nbody',
      file_source: 'doc-42'
    })
  })

  it('retrieve sends only_need_context and maps response+references', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        response: 'assembled context',
        references: [{ reference_id: '1', file_path: 'doc-42' }]
      })
    )
    const c = new LightRagClient('http://localhost:9621')
    const res = await c.retrieve('what is x', {
      mode: 'mix',
      topK: 60,
      chunkTopK: 10
    })

    expect(res.context).toBe('assembled context')
    expect(res.references).toEqual([{ id: '1', source: 'doc-42' }])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      query: 'what is x',
      mode: 'mix',
      top_k: 60,
      chunk_top_k: 10,
      only_need_context: true,
      include_references: true
    })
  })

  it('deleteDoc swallows a 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'not found' }, 404))
    const c = new LightRagClient('http://localhost:9621')
    await expect(c.deleteDoc('gone')).resolves.toBeUndefined()
  })

  it('throws LightRagError on a 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'kaboom' }, 500))
    const c = new LightRagClient('http://localhost:9621')
    await expect(c.health()).rejects.toBeInstanceOf(LightRagError)
  })

  it('normalizes a trailing slash in the base URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'healthy' }))
    const c = new LightRagClient('http://localhost:9621/')
    await c.health()
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:9621/health')
  })
})
