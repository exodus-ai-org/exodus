import { describe, expect, it, vi } from 'vitest'

const calls: Record<string, unknown[]> = { set: [], where: [] }

vi.mock('@main/lib/db/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (w: unknown) => {
          calls.where.push(w)
          return {
            orderBy: async () => [{ id: 'p1', indexStatus: 'processing' }]
          }
        },
        orderBy: async () => [{ id: 'd1' }]
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

const q = await import('@main/lib/db/knowledge-queries')

describe('knowledge-queries', () => {
  it('does not export the substring stub anymore', () => {
    expect('searchKnowledgeDocs' in q).toBe(false)
  })

  it('setIndexStatus writes the patch', async () => {
    calls.set.length = 0
    await q.setIndexStatus('d1', { indexStatus: 'failed', indexError: 'boom' })
    expect(calls.set[0]).toMatchObject({
      indexStatus: 'failed',
      indexError: 'boom'
    })
  })

  it('getProcessingDocs filters by indexStatus', async () => {
    const rows = await q.getProcessingDocs()
    expect(rows[0].indexStatus).toBe('processing')
  })
})
