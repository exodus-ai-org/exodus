// src/main/lib/ai/philharmonic/scheduler.test.ts
import { describe, expect, it, vi } from 'vitest'

const runPmCoordinator = vi.fn(async () => {})
const createConversationMessage = vi.fn(async () => ({ id: 'm' }))
vi.mock('./pm-coordinator', () => ({ runPmCoordinator }))
vi.mock('../../db/conversation-queries', () => ({ createConversationMessage }))
vi.mock('../../db/philharmonic-queries', () => ({
  getCronTasks: async () => [],
  getTaskById: async () => ({
    id: 't',
    title: 'Daily report',
    conversationId: 'c1',
    status: 'pending'
  }),
  updateTask: vi.fn()
}))
vi.mock('node-cron', () => ({
  default: {
    validate: () => true,
    schedule: (_e: string, fn: () => void) => ({ stop: () => {}, _fn: fn })
  }
}))
// Mock logger to avoid pulling in electron / @electron-toolkit/utils
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

const { runScheduledRound } = await import('./scheduler')

describe('runScheduledRound', () => {
  it('injects a round-start system message and runs the PM loop', async () => {
    const emit = vi.fn()
    await runScheduledRound('t', emit)
    expect(createConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1', role: 'system' })
    )
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'round_start', conversationId: 'c1' })
    )
    expect(runPmCoordinator).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        userText: expect.stringContaining('Daily report')
      })
    )
  })
})
