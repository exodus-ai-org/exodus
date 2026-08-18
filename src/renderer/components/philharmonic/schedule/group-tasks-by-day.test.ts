process.env.TZ = 'UTC'

import { describe, expect, it } from 'vitest'

import type { TaskData } from '@/stores/philharmonic'

import { groupTasksByDay } from './group-tasks-by-day'

function makeTask(overrides: Partial<TaskData>): TaskData {
  return {
    id: 't1',
    conversationId: 'c1',
    title: 'Task',
    description: null,
    status: 'pending',
    priority: 'medium',
    cronExpression: null,
    runAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('groupTasksByDay', () => {
  it('groups tasks that fall on the same calendar day', () => {
    const tasks = [
      makeTask({ id: 't1', runAt: '2026-09-01T09:00:00.000Z' }),
      makeTask({ id: 't2', runAt: '2026-09-01T18:00:00.000Z' }),
      makeTask({ id: 't3', runAt: '2026-09-02T09:00:00.000Z' })
    ]
    const groups = groupTasksByDay(tasks)
    expect(groups).toHaveLength(2)
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['t3'])
  })

  it('drops tasks without runAt', () => {
    expect(groupTasksByDay([makeTask({ id: 't1', runAt: null })])).toEqual([])
  })

  it('preserves input order across groups', () => {
    const tasks = [
      makeTask({ id: 't1', runAt: '2026-09-05T09:00:00.000Z' }),
      makeTask({ id: 't2', runAt: '2026-09-01T09:00:00.000Z' })
    ]
    const groups = groupTasksByDay(tasks)
    expect(groups.map((g) => g.tasks[0].id)).toEqual(['t1', 't2'])
  })
})
