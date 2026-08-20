// src/main/lib/db/knowledge-queries.test.ts
import { describe, expect, it, vi } from 'vitest'

const rows = [
  { id: 'd1', title: 'Onboarding', content: 'How to set up the laptop' },
  { id: 'd2', title: 'Security', content: 'Use the VPN for laptop access' }
]

vi.mock('@main/lib/db/db', () => ({
  db: {
    select: () => ({ from: () => ({ orderBy: async () => rows }) })
  }
}))

const { searchKnowledgeDocs } = await import('@main/lib/db/knowledge-queries')

describe('searchKnowledgeDocs', () => {
  it('matches on title or content, case-insensitive', async () => {
    const hits = await searchKnowledgeDocs('LAPTOP')
    expect(hits.map((h) => h.id).sort()).toEqual(['d1', 'd2'])
  })

  it('returns empty array on no match', async () => {
    expect(await searchKnowledgeDocs('nonexistent')).toEqual([])
  })
})
