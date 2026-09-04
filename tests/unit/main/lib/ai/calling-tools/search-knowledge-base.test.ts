import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { searchKnowledgeBase } =
  await import('@main/lib/ai/calling-tools/search-knowledge-base')
const { LightRagError } = await import('@main/lib/knowledge-base/errors')

const client = (retrieve: unknown) => ({ retrieve }) as never

describe('searchKnowledgeBase tool', () => {
  it('returns the assembled context and uses config defaults', async () => {
    const retrieve = vi.fn().mockResolvedValue({
      context: 'Doc says the office opens at 9.',
      references: [{ id: '1', source: 'doc-1' }]
    })
    const tool = searchKnowledgeBase(client(retrieve), null)
    const res = await tool.execute('id', { query: 'office hours' })

    expect(retrieve).toHaveBeenCalledWith('office hours', {
      mode: 'mix',
      topK: 60,
      chunkTopK: 10
    })
    expect(JSON.stringify(res)).toContain('office opens at 9')
  })

  it('passes configured query options through', async () => {
    const retrieve = vi.fn().mockResolvedValue({ context: 'x', references: [] })
    const tool = searchKnowledgeBase(client(retrieve), {
      queryMode: 'local',
      topK: 20,
      chunkTopK: 5
    })
    await tool.execute('id', { query: 'q' })
    expect(retrieve).toHaveBeenCalledWith('q', {
      mode: 'local',
      topK: 20,
      chunkTopK: 5
    })
  })

  it('says "no match" on empty context', async () => {
    const tool = searchKnowledgeBase(
      client(vi.fn().mockResolvedValue({ context: '', references: [] })),
      null
    )
    const res = await tool.execute('id', { query: 'absent' })
    expect(JSON.stringify(res).toLowerCase()).toContain('no ')
  })

  it('returns "unavailable" (never throws) on LightRagError', async () => {
    const tool = searchKnowledgeBase(
      client(vi.fn().mockRejectedValue(new LightRagError('down'))),
      null
    )
    const res = await tool.execute('id', { query: 'q' })
    expect(JSON.stringify(res).toLowerCase()).toContain('unavailable')
  })
})
