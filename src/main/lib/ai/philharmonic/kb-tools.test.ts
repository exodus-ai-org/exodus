// src/main/lib/ai/philharmonic/kb-tools.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../db/knowledge-queries', () => ({
  searchKnowledgeDocs: vi.fn(async (q: string) =>
    q === 'vpn' ? [{ id: 'd2', title: 'Security', snippet: 'Use the VPN' }] : []
  )
}))

const { createSearchKnowledgeBaseTool } = await import('./kb-tools')

describe('searchKnowledgeBase tool', () => {
  it('returns formatted hits', async () => {
    const tool = createSearchKnowledgeBaseTool()
    const res = await tool.execute('id', { query: 'vpn' })
    expect(JSON.stringify(res)).toContain('Security')
  })

  it('reports no results gracefully', async () => {
    const tool = createSearchKnowledgeBaseTool()
    const res = await tool.execute('id', { query: 'absent' })
    expect(JSON.stringify(res).toLowerCase()).toContain('no')
  })
})
