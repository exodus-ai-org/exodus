import type { Model } from '@mariozechner/pi-ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules that transitively import Electron
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

// Mock queries + compaction so we never hit the DB or LLM.
vi.mock('./queries', () => ({
  getContextItems: vi.fn(),
  appendContextItem: vi.fn()
}))
vi.mock('./compaction', () => ({
  runFullCompaction: vi.fn()
}))

import type { LcmStatusEvent } from './lcm-status-bus'

const { lcmStatusBus } = await import('./lcm-status-bus')
const { LcmManager } = await import('./index')
const { runFullCompaction } = await import('./compaction')
const { getContextItems } = await import('./queries')

const fakeModel = { id: 'gpt-4.1-mini' } as unknown as Model<string>

function makeItems(count: number, perItemTokens: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `it-${i}`,
    chatId: 'chat-test',
    ordinal: i,
    kind: 'message' as const,
    refId: `msg-${i}`,
    tokenCount: perItemTokens
  }))
}

describe('LcmManager.compactAfterTurn emits status events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not emit when under threshold', async () => {
    // 10 items × 100 tokens = 1000 — well under threshold
    vi.mocked(getContextItems).mockResolvedValue(makeItems(10, 100))

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    await lcm.compactAfterTurn()
    off()

    expect(events).toEqual([])
    expect(runFullCompaction).not.toHaveBeenCalled()
  })

  it('emits start then complete when over threshold', async () => {
    // First call (before): 100 items × 100 = 10000 tokens, ABOVE 75% of 10_000.
    // Subsequent calls (loop guard + after): same items but shrink each round.
    vi.mocked(getContextItems)
      .mockResolvedValueOnce(makeItems(100, 100)) // initial threshold check
      .mockResolvedValueOnce(makeItems(100, 100)) // round 0 guard
      .mockResolvedValueOnce(makeItems(20, 100)) // round 1 guard — below target
      .mockResolvedValueOnce(makeItems(20, 100)) // final "after" snapshot
    vi.mocked(runFullCompaction).mockResolvedValue(undefined)

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    await lcm.compactAfterTurn()
    off()

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ type: 'start', chatId: 'chat-test' })
    expect(events[1]).toMatchObject({
      type: 'complete',
      chatId: 'chat-test',
      messagesBefore: 100,
      messagesAfter: 20
    })
    if (events[1].type === 'complete') {
      expect(events[1].tokensSaved).toBe(10000 - 2000)
      expect(events[1].durationMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('emits start then error when compaction throws', async () => {
    vi.mocked(getContextItems)
      .mockResolvedValueOnce(makeItems(100, 100)) // threshold check — over
      .mockResolvedValue(makeItems(100, 100))
    vi.mocked(runFullCompaction).mockRejectedValue(new Error('boom'))

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    // compactAfterTurn catches errors internally — we don't expect a throw.
    await lcm.compactAfterTurn()
    off()

    expect(events[0]).toMatchObject({ type: 'start' })
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      chatId: 'chat-test',
      error: expect.stringContaining('boom')
    })
  })
})
