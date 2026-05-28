// src/main/lib/db/conversation-queries.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertReturning = vi.fn()
const updateReturning = vi.fn()
// selectWhere is returned by .from().where() — used by getConversationById
const selectWhere = vi.fn()
const selectOrderBy = vi.fn()

vi.mock('./db', () => ({
  db: {
    insert: () => ({ values: () => ({ returning: insertReturning }) }),
    update: () => ({
      set: () => ({ where: () => ({ returning: updateReturning }) })
    }),
    select: () => ({
      from: () => ({
        where: selectWhere,
        orderBy: selectOrderBy
      })
    })
  }
}))

const queries = await import('./conversation-queries')

describe('conversation-queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createConversation returns the inserted row', async () => {
    insertReturning.mockResolvedValue([{ id: 'c1', title: 'Group' }])
    const row = await queries.createConversation({ title: 'Group' })
    expect(row).toEqual({ id: 'c1', title: 'Group' })
  })

  it('addMemberToConversation merges without duplicates', async () => {
    // getConversationById uses db.select().from().where() — mock selectWhere to
    // return current members; updateReturning returns merged members
    selectWhere.mockResolvedValue([{ id: 'c1', memberAgentIds: ['a1'] }])
    updateReturning.mockResolvedValue([
      { id: 'c1', memberAgentIds: ['a1', 'a2'] }
    ])
    const row = await queries.addMemberToConversation('c1', 'a2')
    expect(row.memberAgentIds).toContain('a2')
    expect(row.memberAgentIds.filter((m: string) => m === 'a1')).toHaveLength(1)
  })
})
