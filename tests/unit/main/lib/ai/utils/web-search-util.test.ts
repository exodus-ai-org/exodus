import {
  fetchWebSearch,
  loadDocumentBuiltin,
  pickAgeLabel,
  webResultsToSources
} from '@main/lib/ai/utils/web-search-util'
import { LocalApiTargetError } from '@main/lib/net/local-api-guard'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
// The built-in loader's one I/O: a pinned GET that never follows a redirect
// (net/pinned-fetch.ts, tested on its own).
const pinnedMock = vi.fn()
vi.mock('@main/lib/net/pinned-fetch', () => ({
  fetchPinned: (...args: unknown[]) => pinnedMock(...args)
}))
afterEach(() => {
  fetchMock.mockReset()
  pinnedMock.mockReset()
})

function htmlResponse(
  status: number,
  headers: Record<string, string>,
  body = ''
) {
  const h = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  )
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => h.get(name.toLowerCase()) ?? null },
    text: async () => body
  }
}

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

describe('loadDocumentBuiltin — cannot reach Exodus’s own API', () => {
  it('fetches a URL on another localhost port normally', async () => {
    pinnedMock.mockResolvedValue(
      htmlResponse(
        200,
        { 'content-type': 'text/html' },
        '<html><body><main>Hello from a local dev server</main></body></html>'
      )
    )

    const result = await loadDocumentBuiltin('http://localhost:3000/page')

    expect(result?.type).toBe('html')
    expect(result?.content).toContain('Hello from a local dev server')
    expect(pinnedMock).toHaveBeenCalledTimes(1)
  })

  it('fetches a URL on a LAN IP, non-Exodus port normally', async () => {
    pinnedMock.mockResolvedValue(
      htmlResponse(
        200,
        { 'content-type': 'text/html' },
        '<html><body><main>Intranet page</main></body></html>'
      )
    )

    const result = await loadDocumentBuiltin('http://192.168.1.50:8080/page')

    expect(result?.content).toContain('Intranet page')
  })

  it('follows an ordinary redirect to another public host', async () => {
    pinnedMock
      .mockResolvedValueOnce(
        htmlResponse(302, { location: 'https://cdn.example/final' })
      )
      .mockResolvedValueOnce(
        htmlResponse(
          200,
          { 'content-type': 'text/html' },
          '<html><body><main>Final content</main></body></html>'
        )
      )

    const result = await loadDocumentBuiltin('https://a.example/start')

    expect(result?.content).toContain('Final content')
    expect(pinnedMock).toHaveBeenCalledTimes(2)
  })

  it('refuses a redirect from a public URL to Exodus’s own loopback API', async () => {
    pinnedMock.mockResolvedValueOnce(
      htmlResponse(302, {
        location: 'http://127.0.0.1:60223/api/v1/settings'
      })
    )

    await expect(
      loadDocumentBuiltin('https://public.example/start')
    ).rejects.toThrow(LocalApiTargetError)
    // The redirect target itself is never actually requested.
    expect(pinnedMock).toHaveBeenCalledTimes(1)
  })

  it('refuses a redirect to the LAN listener by IP too', async () => {
    pinnedMock.mockResolvedValueOnce(
      htmlResponse(302, { location: 'http://127.0.0.1:63129/api/v1/pair' })
    )

    await expect(
      loadDocumentBuiltin('https://public.example/start')
    ).rejects.toThrow('Exodus cannot fetch its own API.')
  })

  it('refuses the initial URL itself when it targets the API directly', async () => {
    await expect(
      loadDocumentBuiltin('http://127.0.0.1:60223/api/v1/settings')
    ).rejects.toThrow(LocalApiTargetError)
    expect(pinnedMock).not.toHaveBeenCalled()
  })

  it('a hop to anything but http(s) is refused before any request', async () => {
    pinnedMock.mockResolvedValueOnce(
      htmlResponse(302, { location: 'file:///etc/passwd' })
    )
    await expect(
      loadDocumentBuiltin('https://public.example/start')
    ).resolves.toBeNull()
    expect(pinnedMock).toHaveBeenCalledTimes(1)
  })
})
