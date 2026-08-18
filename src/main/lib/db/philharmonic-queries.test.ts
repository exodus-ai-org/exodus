// src/main/lib/db/philharmonic-queries.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

let whereArgs: unknown[] = []
let rows: unknown[] = []

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          whereArgs = args
          const result = Promise.resolve(rows) as Promise<unknown[]> & {
            orderBy: (...a: unknown[]) => Promise<unknown[]>
          }
          result.orderBy = () => Promise.resolve(rows)
          return result
        }
      })
    })
  }
}))

const { getUpcomingOneOffTasks, getDueOneOffTasks } =
  await import('./philharmonic-queries')

describe('getUpcomingOneOffTasks', () => {
  beforeEach(() => {
    whereArgs = []
    rows = []
  })

  it('returns rows ordered via the where().orderBy() chain', async () => {
    rows = [{ id: 't1', runAt: new Date('2026-09-01') }]
    const result = await getUpcomingOneOffTasks()
    expect(result).toEqual(rows)
    expect(whereArgs.length).toBeGreaterThan(0)
  })
})

describe('getDueOneOffTasks', () => {
  beforeEach(() => {
    whereArgs = []
    rows = []
  })

  it('returns rows from the where() query', async () => {
    rows = [{ id: 't2', runAt: new Date('2020-01-01') }]
    const result = await getDueOneOffTasks()
    expect(result).toEqual(rows)
    expect(whereArgs.length).toBeGreaterThan(0)
  })
})
