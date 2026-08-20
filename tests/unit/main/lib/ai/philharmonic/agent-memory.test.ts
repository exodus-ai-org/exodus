import { describe, expect, it, vi } from 'vitest'

const createAgentMemory = vi.fn(async () => ({ id: 'mem' }))
vi.mock('@main/lib/db/philharmonic-queries', () => ({ createAgentMemory }))
const { rememberTaskOutcome } =
  await import('@main/lib/ai/philharmonic/agent-memory')

describe('rememberTaskOutcome', () => {
  it('writes a task-source memory scoped to the Group', async () => {
    await rememberTaskOutcome(
      'a1',
      'c1',
      'Build the Q2 report',
      'Compiled revenue tables and a summary.'
    )
    expect(createAgentMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'a1',
        conversationId: 'c1',
        source: 'task'
      })
    )
  })
})
