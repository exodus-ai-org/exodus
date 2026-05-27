import type { Settings } from '@shared/types/db'
import type { WebSearchResult } from '@shared/types/web-search'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWebSearch } from '../utils/web-search-util'
import { webSearch } from './web-search'

vi.mock('../utils/web-search-util', () => ({
  fetchWebSearch: vi.fn()
}))

const mockedFetchWebSearch = vi.mocked(fetchWebSearch)

function result(rank: number, link: string): WebSearchResult {
  return {
    rank,
    link,
    title: `Title ${rank}`,
    content: `Content ${rank}`,
    snippet: `Snippet ${rank}`
  }
}

const settings = {
  webSearch: {
    braveApiKey: 'brave-key',
    country: null,
    languages: null,
    maxResults: null,
    recencyFilter: null,
    domainFilter: null
  }
} as Settings

describe('webSearch tool', () => {
  beforeEach(() => {
    mockedFetchWebSearch.mockReset()
  })

  it('keeps source ranks unique across searches in one tool binding', async () => {
    const sourceSizesAtCall: number[] = []
    mockedFetchWebSearch.mockImplementation(({ webSources }) => {
      sourceSizesAtCall.push(webSources?.size ?? -1)
      const nextRank = (webSources?.size ?? 0) + 1
      return Promise.resolve([
        result(nextRank, `https://example.com/${nextRank}`)
      ])
    })

    const tool = webSearch(settings)

    await tool.execute('call-1', { query: 'first query' })
    await tool.execute('call-2', { query: 'second query' })

    expect(mockedFetchWebSearch).toHaveBeenCalledTimes(2)
    const firstSources = mockedFetchWebSearch.mock.calls[0][0].webSources
    const secondSources = mockedFetchWebSearch.mock.calls[1][0].webSources

    expect(firstSources).toBe(secondSources)
    expect(sourceSizesAtCall).toEqual([0, 1])
    expect(firstSources?.size).toBe(2)
    expect(secondSources?.get('https://example.com/1')?.rank).toBe(1)
    expect(secondSources?.get('https://example.com/2')?.rank).toBe(2)
  })

  it('serializes concurrent searches before assigning ranks', async () => {
    const sourceSizesAtCall: number[] = []
    mockedFetchWebSearch.mockImplementation(({ webSources }) => {
      sourceSizesAtCall.push(webSources?.size ?? -1)
      const nextRank = (webSources?.size ?? 0) + 1
      return Promise.resolve([
        result(nextRank, `https://example.com/concurrent-${nextRank}`)
      ])
    })

    const tool = webSearch(settings)

    await Promise.all([
      tool.execute('call-1', { query: 'first query' }),
      tool.execute('call-2', { query: 'second query' })
    ])

    const firstSources = mockedFetchWebSearch.mock.calls[0][0].webSources
    const secondSources = mockedFetchWebSearch.mock.calls[1][0].webSources

    expect(firstSources).toBe(secondSources)
    expect(sourceSizesAtCall).toEqual([0, 1])
    expect(secondSources?.get('https://example.com/concurrent-1')?.rank).toBe(1)
    expect(secondSources?.get('https://example.com/concurrent-2')?.rank).toBe(2)
  })

  it('passes media requests through to web search', async () => {
    mockedFetchWebSearch.mockResolvedValueOnce([
      {
        ...result(1, 'https://example.com/a'),
        media: [
          {
            kind: 'image',
            title: 'Example image',
            url: 'https://example.com/image.jpg',
            sourceUrl: 'https://example.com/a',
            thumbnailUrl: 'https://example.com/thumb.jpg'
          }
        ]
      }
    ])

    const tool = webSearch(settings)
    const output = await tool.execute('call-1', {
      query: 'visual query',
      media: 'all'
    })

    expect(mockedFetchWebSearch.mock.calls[0][0].media).toBe('all')
    expect(output.content[0].text).toContain('Media results')
    expect(output.content[0].text).toContain('https://example.com/image.jpg')
  })
})
