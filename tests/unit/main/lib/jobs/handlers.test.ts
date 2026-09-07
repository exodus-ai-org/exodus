import type { Model } from '@mariozechner/pi-ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))

const mockGetSettings = vi.fn()
vi.mock('@main/lib/db/queries', () => ({ getSettings: mockGetSettings }))

const mockElasticsearchIndexMessage = vi.fn()
const mockResolveSearchProvider = vi.fn()
vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: mockResolveSearchProvider
}))

const mockTrackNewMessages = vi.fn()
const mockCompactAfterTurn = vi.fn()
vi.mock('@main/lib/ai/context-management', () => ({
  LcmManager: vi.fn().mockImplementation(function () {
    return {
      trackNewMessages: mockTrackNewMessages,
      compactAfterTurn: mockCompactAfterTurn
    }
  })
}))

const mockRunMemoryConsolidation = vi.fn()
vi.mock('@main/lib/ai/memory/manager', () => ({
  runMemoryConsolidation: mockRunMemoryConsolidation
}))

const mockRunDiscoverRefresh = vi.fn()
vi.mock('@main/lib/discover/manager', () => ({
  runDiscoverRefresh: mockRunDiscoverRefresh
}))

const mockGetKnowledgeDocById = vi.fn()
const mockSetIndexStatus = vi.fn()
vi.mock('@main/lib/db/knowledge-queries', () => ({
  getKnowledgeDocById: mockGetKnowledgeDocById,
  setIndexStatus: mockSetIndexStatus
}))

const mockKbInsertText = vi.fn()
const mockKbDeleteDoc = vi.fn()
vi.mock('@main/lib/knowledge-base/resolve-knowledge-base', () => ({
  resolveKnowledgeBase: () => ({
    insertText: mockKbInsertText,
    deleteDoc: mockKbDeleteDoc
  })
}))
// contentHash (from knowledge-base/reconcile) is pure — use the real module.

const { handlers } = await import('@main/lib/jobs/handlers')

const fakeModel = { id: 'gpt-4.1-mini' } as unknown as Model<string>

describe('handlers.index-message', () => {
  it('does nothing when elasticsearch is not configured', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockResolveSearchProvider.mockReturnValue({ elasticsearch: null })

    await handlers['index-message']({
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'hello',
      createdAt: new Date()
    })

    expect(mockElasticsearchIndexMessage).not.toHaveBeenCalled()
  })

  it('indexes the message with searchText computed when elasticsearch is configured', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockResolveSearchProvider.mockReturnValue({
      elasticsearch: { indexMessage: mockElasticsearchIndexMessage }
    })
    mockElasticsearchIndexMessage.mockResolvedValue(undefined)

    await handlers['index-message']({
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'hello',
      createdAt: new Date('2026-01-01')
    })

    expect(mockElasticsearchIndexMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg-1',
        chatId: 'chat-1',
        searchText: 'hello'
      })
    )
  })
})

describe('handlers.lcm-post-turn', () => {
  it('constructs an LcmManager and tracks then compacts', async () => {
    mockTrackNewMessages.mockResolvedValue(undefined)
    mockCompactAfterTurn.mockResolvedValue(undefined)

    await handlers['lcm-post-turn']({
      chatId: 'chat-1',
      chatModel: fakeModel,
      apiKey: 'key',
      freshTailSize: 16,
      contextWindowPercent: 75,
      newMessages: [{ id: 'msg-1', content: 'hi' }]
    })

    expect(mockTrackNewMessages).toHaveBeenCalledWith([
      { id: 'msg-1', content: 'hi' }
    ])
    expect(mockCompactAfterTurn).toHaveBeenCalledTimes(1)
  })
})

describe('handlers.memory-consolidate', () => {
  it('calls runMemoryConsolidation with the payload fields', async () => {
    mockRunMemoryConsolidation.mockResolvedValue(undefined)

    await handlers['memory-consolidate']({
      messages: [{ role: 'user', content: 'hi' }],
      chatModel: fakeModel,
      apiKey: 'key'
    })

    expect(mockRunMemoryConsolidation).toHaveBeenCalledWith(
      [{ role: 'user', content: 'hi' }],
      fakeModel,
      'key'
    )
  })
})

describe('handlers.kb-sync', () => {
  beforeEach(() => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockGetKnowledgeDocById.mockReset()
    mockSetIndexStatus.mockReset()
    mockKbInsertText.mockReset()
    mockKbDeleteDoc.mockReset()
  })

  it('inserts a new doc and marks it processing', async () => {
    mockGetKnowledgeDocById.mockResolvedValue({
      id: 'd1',
      title: 'T',
      content: 'body',
      syncedHash: null,
      indexStatus: 'pending',
      lightragDocId: null
    })
    mockKbInsertText.mockResolvedValue({ trackId: 'txt_9' })

    await handlers['kb-sync']({ op: 'upsert', docId: 'd1' })

    expect(mockKbInsertText).toHaveBeenCalledWith('# T\n\nbody', 'd1')
    expect(mockSetIndexStatus).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({
        indexStatus: 'processing',
        lightragTrackId: 'txt_9'
      })
    )
  })

  it('deletes the old LightRAG doc before reinserting on content change', async () => {
    mockGetKnowledgeDocById.mockResolvedValue({
      id: 'd1',
      title: 'T',
      content: 'new body',
      syncedHash: 'old-hash',
      indexStatus: 'processed',
      lightragDocId: 'ldoc-1'
    })
    mockKbInsertText.mockResolvedValue({ trackId: 'txt_10' })

    await handlers['kb-sync']({ op: 'upsert', docId: 'd1' })

    expect(mockKbDeleteDoc).toHaveBeenCalledWith('ldoc-1')
    expect(mockKbInsertText).toHaveBeenCalled()
  })

  it('is a no-op when the hash is unchanged and already processed', async () => {
    const { contentHash } = await import('@main/lib/knowledge-base/reconcile')
    mockGetKnowledgeDocById.mockResolvedValue({
      id: 'd1',
      title: 'T',
      content: 'body',
      syncedHash: contentHash('T', 'body'),
      indexStatus: 'processed',
      lightragDocId: 'ldoc-1'
    })

    await handlers['kb-sync']({ op: 'upsert', docId: 'd1' })
    expect(mockKbInsertText).not.toHaveBeenCalled()
  })

  it('marks failed and rethrows when insertText throws', async () => {
    mockGetKnowledgeDocById.mockResolvedValue({
      id: 'd1',
      title: 'T',
      content: 'body',
      syncedHash: null,
      indexStatus: 'pending',
      lightragDocId: null
    })
    mockKbInsertText.mockRejectedValue(new Error('down'))

    await expect(
      handlers['kb-sync']({ op: 'upsert', docId: 'd1' })
    ).rejects.toThrow('down')
    expect(mockSetIndexStatus).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ indexStatus: 'failed' })
    )
  })

  it('delete op calls deleteDoc and swallows errors', async () => {
    mockKbDeleteDoc.mockRejectedValue(new Error('404'))
    await expect(
      handlers['kb-sync']({ op: 'delete', lightragDocId: 'ldoc-x' })
    ).resolves.toBeUndefined()
  })
})

describe('handlers.discover-refresh', () => {
  it('forwards the force flag to runDiscoverRefresh', async () => {
    mockRunDiscoverRefresh.mockResolvedValue(undefined)
    await handlers['discover-refresh']({ force: true })
    expect(mockRunDiscoverRefresh).toHaveBeenCalledWith({ force: true })
  })

  it('treats an empty payload as force: undefined', async () => {
    mockRunDiscoverRefresh.mockResolvedValue(undefined)
    await handlers['discover-refresh']({})
    expect(mockRunDiscoverRefresh).toHaveBeenCalledWith({ force: undefined })
  })
})
