import { describe, expect, it, vi } from 'vitest'
const createAgentMemory = vi.fn(async () => ({ id: 'mem' }))
vi.mock('../../db/philharmonic-queries', () => ({ createAgentMemory }))
const { rememberTaskOutcome } = await import('./agent-memory')

describe('rememberTaskOutcome', () => {
  it('writes a task-source memory with a truncated value', async () => {
    await rememberTaskOutcome(
      'a1',
      'Build the Q2 report',
      'Compiled revenue tables and a summary.'
    )
    expect(createAgentMemory).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'a1', source: 'task' })
    )
  })
})
