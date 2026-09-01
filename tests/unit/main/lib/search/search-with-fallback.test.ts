import type { Settings } from '@main/lib/db/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/db', () => ({ pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const mockElasticsearchSearch = vi.fn()
const mockPgliteSearch = vi.fn()

vi.mock('@main/lib/search/providers/elasticsearch-search', () => ({
  createElasticsearchProvider: vi.fn(() => ({
    indexMessage: vi.fn(),
    deleteByChatId: vi.fn(),
    deleteAll: vi.fn(),
    search: mockElasticsearchSearch
  }))
}))

vi.mock('@main/lib/search/providers/pglite-search', () => ({
  pgliteSearchProvider: {
    indexMessage: vi.fn(),
    deleteByChatId: vi.fn(),
    deleteAll: vi.fn(),
    search: mockPgliteSearch
  }
}))

const { searchWithFallback } =
  await import('@main/lib/search/resolve-search-provider')

const configuredSettings = {
  id: 'global',
  search: { elasticsearch: { url: 'http://search-fallback-test:9200' } }
} as Settings

const unconfiguredSettings = { id: 'global' } as Settings

describe('searchWithFallback', () => {
  beforeEach(() => {
    mockElasticsearchSearch.mockReset()
    mockPgliteSearch.mockReset()
  })

  it('returns the Elasticsearch result when the query succeeds', async () => {
    mockElasticsearchSearch.mockResolvedValueOnce([{ id: 'msg-1' }])

    const result = await searchWithFallback(configuredSettings, 'hello')

    expect(result).toEqual([{ id: 'msg-1' }])
    expect(mockElasticsearchSearch).toHaveBeenCalledWith('hello')
    expect(mockPgliteSearch).not.toHaveBeenCalled()
  })

  it('falls back to PGlite when the Elasticsearch query throws', async () => {
    mockElasticsearchSearch.mockRejectedValueOnce(new Error('cluster down'))
    mockPgliteSearch.mockResolvedValueOnce([{ id: 'msg-2' }])

    const result = await searchWithFallback(configuredSettings, 'hello')

    expect(result).toEqual([{ id: 'msg-2' }])
    expect(mockPgliteSearch).toHaveBeenCalledWith('hello')
  })

  it('queries PGlite directly when Elasticsearch is not configured', async () => {
    mockPgliteSearch.mockResolvedValueOnce([{ id: 'msg-3' }])

    const result = await searchWithFallback(unconfiguredSettings, 'hello')

    expect(result).toEqual([{ id: 'msg-3' }])
    expect(mockElasticsearchSearch).not.toHaveBeenCalled()
  })
})
