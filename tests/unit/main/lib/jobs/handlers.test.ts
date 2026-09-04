import type { Model } from '@mariozechner/pi-ai'
import { describe, expect, it, vi } from 'vitest'

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
