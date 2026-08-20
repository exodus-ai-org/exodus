// src/main/lib/server/routes/philharmonic-conversations.test.ts
import { describe, expect, it, vi } from 'vitest'
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/server/utils', () => ({
  getRequiredParam: (_c: unknown, _k: string) => 'id',
  handleDatabaseOperation: (fn: () => unknown) => fn(),
  successResponse: (_c: unknown, data: unknown) => data,
  validateSchema: (_s: unknown, d: unknown) => d
}))
vi.mock('@main/lib/db/philharmonic-queries', () => ({
  getPhilharmonicCostRows: getPhilharmonicCostRows
}))
const getPhilharmonicCostRows = vi.fn()
vi.mock('@main/lib/db/conversation-queries', () => ({}))
vi.mock('@main/lib/db/knowledge-queries', () => ({}))
vi.mock('@main/lib/ai/philharmonic/pm-coordinator', () => ({
  runPmCoordinator: vi.fn()
}))
vi.mock('@main/lib/ai/philharmonic/ask-user-registry', () => ({
  askUserRegistry: { resolve: vi.fn() }
}))
vi.mock('@main/lib/server/routes/philharmonic-sse', () => ({
  emitToConversation: vi.fn()
}))

const { aggregateCosts } =
  await import('@main/lib/server/routes/philharmonic-conversations')

describe('aggregateCosts', () => {
  it('sums tokens and cost by conversation and agent', () => {
    const rows = [
      {
        conversationId: 'c1',
        agentId: 'a1',
        tokenUsage: { inputTokens: 100, outputTokens: 50, cost: 0.5 },
        startedAt: new Date('2026-05-01')
      },
      {
        conversationId: 'c1',
        agentId: 'a2',
        tokenUsage: { inputTokens: 200, outputTokens: 80, cost: 0.7 },
        startedAt: new Date('2026-05-01')
      }
    ]
    const summary = aggregateCosts(rows as never)
    expect(summary.totalCost).toBeCloseTo(1.2)
    expect(summary.totalTokens).toBe(430)
    expect(
      summary.byConversation.find((c) => c.conversationId === 'c1')!.cost
    ).toBeCloseTo(1.2)
    expect(summary.byAgent).toHaveLength(2)
  })
})
