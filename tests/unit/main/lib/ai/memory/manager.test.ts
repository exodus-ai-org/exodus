import type { Model } from '@mariozechner/pi-ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))
vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

const mockCreateMemory = vi.fn()
const mockUpdateMemory = vi.fn()
const mockGetActiveMemories = vi.fn()
const mockTouchMemories = vi.fn()
const mockLogMemoryUsage = vi.fn()
vi.mock('@main/lib/db/memory-queries', () => ({
  createMemory: mockCreateMemory,
  updateMemory: mockUpdateMemory,
  getActiveMemories: mockGetActiveMemories,
  touchMemories: mockTouchMemories,
  logMemoryUsage: mockLogMemoryUsage
}))

const mockCompleteSimple = vi.fn()
vi.mock('@mariozechner/pi-ai', () => ({
  completeSimple: (...args: unknown[]) => mockCompleteSimple(...args)
}))

const {
  runMemoryConsolidation,
  loadRelevantMemories,
  formatMemoriesForSystem
} = await import('@main/lib/ai/memory/manager')

const model = { id: 'm' } as unknown as Model<string>

function llmReturns(obj: unknown) {
  mockCompleteSimple.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(obj) }]
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetActiveMemories.mockResolvedValue([])
  mockCreateMemory.mockResolvedValue({})
  mockUpdateMemory.mockResolvedValue({})
  mockTouchMemories.mockResolvedValue(undefined)
  mockLogMemoryUsage.mockResolvedValue(undefined)
})

describe('runMemoryConsolidation', () => {
  it('creates a new entry for a create op', async () => {
    llmReturns({
      operations: [
        {
          op: 'create',
          section: 'topic',
          key: 'Classical Music',
          summary: 'Into classical music',
          details: ['Attends Berlin Philharmonic']
        }
      ]
    })

    await runMemoryConsolidation([{ role: 'user', content: 'x' }], model, 'k')

    expect(mockCreateMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        section: 'topic',
        key: 'Classical Music',
        details: ['Attends Berlin Philharmonic']
      })
    )
    expect(mockUpdateMemory).not.toHaveBeenCalled()
  })

  it('updates an existing entry when the op targets a known id', async () => {
    mockGetActiveMemories.mockResolvedValue([
      {
        id: 'mem-1',
        section: 'topic',
        key: 'Classical Music',
        summary: 'old',
        details: []
      }
    ])
    llmReturns({
      operations: [
        {
          op: 'update',
          id: 'mem-1',
          section: 'topic',
          key: 'Classical Music',
          summary: 'new summary',
          details: ['a', 'b']
        }
      ]
    })

    await runMemoryConsolidation([{ role: 'user', content: 'x' }], model, 'k')

    expect(mockUpdateMemory).toHaveBeenCalledWith(
      'mem-1',
      expect.objectContaining({ summary: 'new summary', details: ['a', 'b'] })
    )
    expect(mockCreateMemory).not.toHaveBeenCalled()
  })

  it('falls back to create when an update targets an unknown id', async () => {
    llmReturns({
      operations: [
        {
          op: 'update',
          id: 'ghost',
          section: 'profile',
          key: 'X',
          summary: 's',
          details: []
        }
      ]
    })

    await runMemoryConsolidation([{ role: 'user', content: 'x' }], model, 'k')

    expect(mockCreateMemory).toHaveBeenCalledTimes(1)
    expect(mockUpdateMemory).not.toHaveBeenCalled()
  })

  it('writes nothing for an empty operations list', async () => {
    llmReturns({ operations: [] })
    await runMemoryConsolidation([{ role: 'user', content: 'x' }], model, 'k')
    expect(mockCreateMemory).not.toHaveBeenCalled()
    expect(mockUpdateMemory).not.toHaveBeenCalled()
  })
})

describe('loadRelevantMemories', () => {
  it('touches + logs the selected memories and returns them', async () => {
    mockGetActiveMemories.mockResolvedValue([
      { id: 'a', section: 'topic', key: 'A', summary: 'sa', details: [] },
      { id: 'b', section: 'topic', key: 'B', summary: 'sb', details: [] }
    ])
    llmReturns({ selectedMemoryIds: ['b'] })

    const result = await loadRelevantMemories('hi', model, 'k', 'chat-1')

    expect(result.map((m) => m.id)).toEqual(['b'])
    expect(mockTouchMemories).toHaveBeenCalledWith(['b'])
    expect(mockLogMemoryUsage).toHaveBeenCalledWith(
      expect.objectContaining({ memoryId: 'b', sessionId: 'chat-1' })
    )
  })

  it('returns [] and touches nothing when no memories exist', async () => {
    mockGetActiveMemories.mockResolvedValue([])
    const result = await loadRelevantMemories('hi', model, 'k', 'chat-1')
    expect(result).toEqual([])
    expect(mockCompleteSimple).not.toHaveBeenCalled()
    expect(mockTouchMemories).not.toHaveBeenCalled()
  })
})

describe('formatMemoriesForSystem', () => {
  it('renders a <user_memory> block with headings and bullets', () => {
    const out = formatMemoriesForSystem([
      {
        id: 'a',
        userId: 'u',
        section: 'topic',
        key: 'Classical Music',
        summary: 'Likes classical music',
        details: ['Berlin Philharmonic', 'Musikverein'],
        confidence: 0.8,
        source: 'implicit',
        createdAt: null,
        updatedAt: null,
        lastUsedAt: null,
        isActive: true
      }
    ])
    expect(out).toContain('<user_memory>')
    expect(out).toContain('## Classical Music (topic)')
    expect(out).toContain('- Berlin Philharmonic')
  })

  it('returns an empty string for no memories', () => {
    expect(formatMemoriesForSystem([])).toBe('')
  })
})
