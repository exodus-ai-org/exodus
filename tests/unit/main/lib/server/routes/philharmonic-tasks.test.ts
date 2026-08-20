// src/main/lib/server/routes/philharmonic-tasks.test.ts
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
  createTask: vi.fn(),
  getActiveCronTasks: vi.fn(),
  getUpcomingOneOffTasks: vi.fn(),
  updateTask: vi.fn()
}))
vi.mock('@main/lib/ai/philharmonic/scheduler', () => ({
  scheduleTask: vi.fn(),
  unscheduleTask: vi.fn()
}))

const { scheduleTaskSchema } =
  await import('@main/lib/server/routes/philharmonic-tasks')

describe('scheduleTaskSchema', () => {
  const base = {
    title: 'Weekly report',
    conversationId: '11111111-1111-1111-8111-111111111111'
  }

  it('accepts a one-off task with runAt', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      runAt: '2026-09-01T09:00:00.000Z'
    })
    expect(result.success).toBe(true)
  })

  it('accepts a recurring task with cronExpression', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      cronExpression: '0 9 * * 1'
    })
    expect(result.success).toBe(true)
  })

  it('rejects a task with both cronExpression and runAt', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      cronExpression: '0 9 * * 1',
      runAt: '2026-09-01T09:00:00.000Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects a task with neither cronExpression nor runAt', () => {
    const result = scheduleTaskSchema.safeParse(base)
    expect(result.success).toBe(false)
  })
})
