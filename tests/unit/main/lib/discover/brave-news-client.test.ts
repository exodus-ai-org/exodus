import { searchBraveNews } from '@main/lib/discover/brave-news-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
afterEach(() => fetchMock.mockReset())

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('searchBraveNews', () => {
  it('sends the query, count, freshness, and auth header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))
    await searchBraveNews('k', 'SoftBank 9984', {
      count: 3,
      country: 'US',
      language: 'en'
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('q=SoftBank')
    expect(String(url)).toContain('count=3')
    expect(String(url)).toContain('freshness=pd')
    expect(String(url)).toContain('country=us')
    expect(String(url)).toContain('search_lang=en')
    expect(init.headers['x-subscription-token']).toBe('k')
  })

  it('maps results, preferring source over meta_url.hostname', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'Article A',
            url: 'https://example.com/a',
            description: 'desc',
            source: 'Example News',
            age: '2h',
            thumbnail: { src: 'https://img/a.jpg' },
            meta_url: { hostname: 'example.com', favicon: 'https://img/f.ico' }
          }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res).toEqual([
      {
        title: 'Article A',
        url: 'https://example.com/a',
        description: 'desc',
        source: 'Example News',
        favicon: 'https://img/f.ico',
        thumbnail: 'https://img/a.jpg',
        age: '2h'
      }
    ])
  })

  it('falls back to meta_url.hostname when source is missing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'B',
            url: 'https://foo.example/b',
            meta_url: { hostname: 'foo.example' }
          }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res[0].source).toBe('foo.example')
  })

  it('skips a malformed result instead of failing the whole batch', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          { description: 'no title or url' },
          { title: 'ok', url: 'https://x/y' }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res).toHaveLength(1)
    expect(res[0].title).toBe('ok')
  })

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401))
    await expect(searchBraveNews('bad', 'q', { count: 3 })).rejects.toThrow()
  })
})
