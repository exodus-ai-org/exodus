import { searchBraveNews } from '@main/lib/discover/brave-news-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
afterEach(() => fetchMock.mockReset())

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('searchBraveNews', () => {
  it('sends the query, a widened pool count, freshness, and auth header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))
    await searchBraveNews('k', 'SoftBank 9984', {
      count: 3,
      country: 'US',
      language: 'en'
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('q=SoftBank')
    // Requests a wide relevance-ranked pool (min 12), then re-ranks locally.
    expect(String(url)).toContain('count=15')
    expect(String(url)).toContain('freshness=pd')
    expect(String(url)).toContain('country=us')
    expect(String(url)).toContain('search_lang=en')
    expect(init.headers['x-subscription-token']).toBe('k')
  })

  it('re-ranks the pool by recency and returns the freshest `count`', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'old preview',
            url: 'https://x/1',
            page_age: '2026-09-09T09:00:00'
          },
          {
            title: 'match report',
            url: 'https://x/2',
            page_age: '2026-09-09T18:46:20'
          },
          { title: 'mid', url: 'https://x/3', page_age: '2026-09-09T13:00:00' }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 2 })
    expect(res.map((a) => a.title)).toEqual(['match report', 'mid'])
    expect(res[0].publishedAt).toBe('2026-09-09T18:46:20Z')
  })

  it('sorts a result with no timestamp to the bottom (evergreen page)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          { title: 'club profile', url: 'https://x/profile' },
          { title: 'todays news', url: 'https://x/news', age: '3 hours ago' }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 2 })
    expect(res.map((a) => a.title)).toEqual(['todays news', 'club profile'])
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

  it('prefers profile.name (the readable outlet) over source and hostname', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'C',
            url: 'https://www.espn.com/soccer/story',
            source: 'espn.com',
            profile: { name: 'ESPN' },
            meta_url: { hostname: 'www.espn.com' }
          }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res[0].source).toBe('ESPN')
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
