import type { Message } from '@main/lib/db/schema'
import { describe, expect, it, vi } from 'vitest'

const mockIndex = vi.fn()
const mockSearch = vi.fn()
const mockDeleteByQuery = vi.fn()
const mockGetMessagesWithTitleByIds = vi.fn()

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      index: mockIndex,
      search: mockSearch,
      deleteByQuery: mockDeleteByQuery
    }
  })
}))

vi.mock('@main/lib/db/queries', () => ({
  getMessagesWithTitleByIds: mockGetMessagesWithTitleByIds
}))

const { createElasticsearchProvider } =
  await import('@main/lib/search/providers/elasticsearch-search')

const baseMessage: Message = {
  id: 'msg-1',
  chatId: 'chat-1',
  role: 'assistant',
  content: [{ type: 'text', text: 'hello' }],
  searchText: 'hello',
  usage: null,
  api: null,
  provider: null,
  model: null,
  stopReason: null,
  errorMessage: null,
  toolCallId: null,
  toolName: null,
  details: null,
  isError: null,
  durationMs: null,
  createdAt: new Date('2026-01-01')
}

describe('createElasticsearchProvider', () => {
  it('indexes a message with only chatId, searchText, createdAt', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.indexMessage(baseMessage)

    expect(mockIndex).toHaveBeenCalledWith({
      index: 'exodus-messages',
      id: 'msg-1',
      document: {
        chatId: 'chat-1',
        searchText: 'hello',
        createdAt: baseMessage.createdAt
      }
    })
  })

  it('skips indexing when searchText is null', async () => {
    mockIndex.mockClear()

    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.indexMessage({ ...baseMessage, searchText: null })

    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('uses a custom index name when configured', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200',
      indexName: 'custom-index'
    })
    await provider.indexMessage(baseMessage)

    expect(mockIndex).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'custom-index' })
    )
  })

  it('deletes by chatId via a term query', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.deleteByChatId('chat-1')

    expect(mockDeleteByQuery).toHaveBeenCalledWith({
      index: 'exodus-messages',
      query: { term: { chatId: 'chat-1' } }
    })
  })

  it('searches and re-fetches full rows by returned ids', async () => {
    mockSearch.mockResolvedValue({
      hits: { hits: [{ _id: 'msg-1' }, { _id: 'msg-2' }] }
    })
    mockGetMessagesWithTitleByIds.mockResolvedValue([
      { ...baseMessage, title: 'Chat One' }
    ])

    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    const results = await provider.search('hello')

    expect(mockSearch).toHaveBeenCalledWith({
      index: 'exodus-messages',
      query: { match: { searchText: 'hello' } }
    })
    expect(mockGetMessagesWithTitleByIds).toHaveBeenCalledWith([
      'msg-1',
      'msg-2'
    ])
    expect(results).toEqual([{ ...baseMessage, title: 'Chat One' }])
  })

  it('returns an empty array without querying PGlite when there are no hits', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } })
    mockGetMessagesWithTitleByIds.mockClear()

    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    const results = await provider.search('nomatch')

    expect(results).toEqual([])
    expect(mockGetMessagesWithTitleByIds).not.toHaveBeenCalled()
  })
})
