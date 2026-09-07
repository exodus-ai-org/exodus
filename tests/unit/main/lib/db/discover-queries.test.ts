import { describe, expect, it, vi } from 'vitest'

const calls: Record<string, unknown[]> = { set: [], insertValues: [] }

vi.mock('@main/lib/db/db', () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        calls.insertValues.push(v)
        return { onConflictDoNothing: async () => undefined }
      }
    }),
    select: () => ({
      from: () => ({
        where: async () => [
          {
            id: 'global',
            groups: [],
            generatedAt: null,
            status: 'idle',
            error: null
          }
        ]
      })
    }),
    update: () => ({
      set: (s: unknown) => {
        calls.set.push(s)
        return { where: async () => undefined }
      }
    })
  }
}))

const q = await import('@main/lib/db/discover-queries')

describe('discover-queries', () => {
  it('getDiscoverFeed ensures the row exists and returns it', async () => {
    const row = await q.getDiscoverFeed()
    expect(row.id).toBe('global')
    expect(calls.insertValues[0]).toEqual({ id: 'global' })
  })

  it('setDiscoverFeed writes the patch', async () => {
    calls.set.length = 0
    await q.setDiscoverFeed({ status: 'refreshing' })
    expect(calls.set[0]).toEqual({ status: 'refreshing' })
  })
})
