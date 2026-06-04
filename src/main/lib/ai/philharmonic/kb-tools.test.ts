// src/main/lib/ai/philharmonic/kb-tools.test.ts
import { describe, expect, it, vi } from 'vitest'

const searchSpy = vi.fn(
  async (q: string, _allowed: string[] | null | undefined) =>
    q === 'vpn' ? [{ id: 'd2', title: 'Security', snippet: 'Use the VPN' }] : []
)

vi.mock('../../db/knowledge-queries', () => ({
  searchKnowledgeDocs: searchSpy
}))

const { createSearchKnowledgeBaseTool } = await import('./kb-tools')

describe('searchKnowledgeBase tool', () => {
  it('returns formatted hits and forwards the team scope', async () => {
    searchSpy.mockClear()
    const tool = createSearchKnowledgeBaseTool(['t1', 't2'])
    const res = await tool.execute('id', { query: 'vpn' })
    expect(JSON.stringify(res)).toContain('Security')
    expect(searchSpy).toHaveBeenCalledWith('vpn', ['t1', 't2'])
  })

  it('reports no results gracefully and passes an empty scope through', async () => {
    searchSpy.mockClear()
    const tool = createSearchKnowledgeBaseTool([])
    const res = await tool.execute('id', { query: 'absent' })
    expect(JSON.stringify(res).toLowerCase()).toContain('no')
    expect(searchSpy).toHaveBeenCalledWith('absent', [])
  })
})
