// src/main/lib/ai/philharmonic/scheduler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const runPmCoordinator = vi.fn(async () => {})
const createConversationMessage = vi.fn(async () => ({ id: 'm' }))
const updateTask = vi.fn()
const getDueOneOffTasks = vi.fn(async () => [] as Array<{ id: string }>)
vi.mock('./pm-coordinator', () => ({ runPmCoordinator }))
vi.mock('../../db/conversation-queries', () => ({ createConversationMessage }))
vi.mock('../../db/philharmonic-queries', () => ({
  getCronTasks: async () => [],
  getDueOneOffTasks,
  getTaskById: async () => ({
    id: 't',
    title: 'Daily report',
    conversationId: 'c1',
    status: 'pending'
  }),
  updateTask
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

const { runScheduledRound, runDueOneOffTasks } = await import('./scheduler')

describe('runScheduledRound', () => {
  beforeEach(() => vi.clearAllMocks())

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

describe('runDueOneOffTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fires each due task and marks it completed', async () => {
    getDueOneOffTasks.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }])
    await runDueOneOffTasks(vi.fn())
    expect(runPmCoordinator).toHaveBeenCalledTimes(2)
    expect(updateTask).toHaveBeenCalledWith('t1', { status: 'completed' })
    expect(updateTask).toHaveBeenCalledWith('t2', { status: 'completed' })
  })

  it('does nothing when no tasks are due', async () => {
    getDueOneOffTasks.mockResolvedValueOnce([])
    await runDueOneOffTasks(vi.fn())
    expect(runPmCoordinator).not.toHaveBeenCalled()
  })
})
