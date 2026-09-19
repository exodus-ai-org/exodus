import {
  fetchWebSearch,
  pickAgeLabel,
  webResultsToSources
} from '@main/lib/ai/utils/web-search-util'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
afterEach(() => fetchMock.mockReset())

function ctxResponse(
  generic: { url: string; title?: string; snippets: string[] }[]
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      grounding: { generic },
      sources: Object.fromEntries(
        generic.map((g) => [g.url, { hostname: new URL(g.url).hostname }])
      )
    })
  } as Response
}

describe('fetchWebSearch — query fan-out merge', () => {
  it('unions grounded sources across variants; multi-hit URLs rank first', async () => {
    fetchMock.mockImplementation((url: string) => {
      const q = new URL(url).searchParams.get('q')
      if (q === 'orig')
        return Promise.resolve(
          ctxResponse([
            { url: 'https://x.com/a', title: 'X', snippets: ['from orig'] },
            { url: 'https://y.com/b', title: 'Y', snippets: ['y only'] }
          ])
        )
      if (q === 'variant one')
        return Promise.resolve(
          ctxResponse([
            { url: 'https://x.com/a', title: 'X', snippets: ['from v1'] },
            { url: 'https://z.com/c', title: 'Z', snippets: ['z only'] }
          ])
        )
      return Promise.resolve(
        ctxResponse([
          { url: 'https://x.com/a', title: 'X', snippets: ['from v2'] }
        ])
      )
    })

    const results = await fetchWebSearch({
      query: 'orig',
      braveApiKey: 'k',
      expandedQueries: ['variant one', 'variant two']
    })

    expect(results?.map((r) => r.link)).toEqual([
      'https://x.com/a', // hit by all 3 variants
      'https://y.com/b', // order 1
      'https://z.com/c' // order 2
    ])
    // merged, de-duplicated snippets
    expect(results?.[0].content).toBe('from orig\n\nfrom v1\n\nfrom v2')
    expect(results?.map((r) => r.rank)).toEqual([1, 2, 3])
  })
})

describe('webResultsToSources', () => {
  it('flattens web + news + discussions, deduping by url', () => {
    const flat = webResultsToSources({
      web: {
        results: [
          {
            title: 'A',
            url: 'https://a.com',
            description: 'desc a',
            extra_snippets: ['more a'],
            profile: { name: 'Site A' },
            meta_url: { hostname: 'a.com' }
          },
          { title: 'no content', url: 'https://x.com' }
        ]
      },
      news: {
        results: [{ title: 'A dup', url: 'https://a.com', description: 'dup' }]
      },
      discussions: {
        results: [
          {
            title: 'Q',
            url: 'https://forum.com/t',
            data: {
              forum_name: 'r/rust',
              num_answers: 3,
              question: 'how?',
              top_comment: 'like this'
            }
          }
        ]
      }
    })
    expect(flat.map((s) => s.url)).toEqual([
      'https://a.com',
      'https://forum.com/t'
    ])
    expect(flat[0].content).toBe('desc a\n\nmore a')
    expect(flat[0].siteName).toBe('Site A')
    expect(flat[1].content).toContain('[Forum: r/rust, 3 answers]')
    expect(flat[1].content).toContain('how?')
  })

  it('returns [] for a null response', () => {
    expect(webResultsToSources(null)).toEqual([])
  })
})

describe('pickAgeLabel', () => {
  it('prefers a relative label', () => {
    expect(
      pickAgeLabel(['Thursday, June 18, 2026', '2026-06-18', '5 days ago'])
    ).toBe('5 days ago')
  })

  it('falls back to the ISO date when no relative label', () => {
    expect(pickAgeLabel(['Monday, October 23, 2023', '2023-10-23'])).toBe(
      '2023-10-23'
    )
  })

  it('returns undefined for empty/missing input', () => {
    expect(pickAgeLabel([])).toBeUndefined()
    expect(pickAgeLabel(undefined)).toBeUndefined()
  })
})
