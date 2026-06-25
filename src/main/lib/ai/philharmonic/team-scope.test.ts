// src/main/lib/ai/philharmonic/team-scope.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getConversationById = vi.fn()
const getAgentById = vi.fn()

vi.mock('../../db/conversation-queries', () => ({ getConversationById }))
vi.mock('../../db/philharmonic-queries', () => ({ getAgentById }))

const { computeAllowedTeamIds } = await import('./team-scope')

beforeEach(() => {
  getConversationById.mockReset()
  getAgentById.mockReset()
})

describe('computeAllowedTeamIds', () => {
  it('returns [] when the conversation has no members', async () => {
    getConversationById.mockResolvedValue({ memberAgentIds: [] })
    expect(await computeAllowedTeamIds('c1')).toEqual([])
  })

  it('returns the unique team ids of the members', async () => {
    getConversationById.mockResolvedValue({ memberAgentIds: ['a', 'b', 'c'] })
    getAgentById.mockImplementation(async (id: string) => {
      if (id === 'a') return { teamId: 't1' }
      if (id === 'b') return { teamId: 't2' }
      if (id === 'c') return { teamId: 't1' }
      return null
    })
    expect((await computeAllowedTeamIds('c1')).sort()).toEqual(['t1', 't2'])
  })

  it('skips members with no team and missing rows', async () => {
    getConversationById.mockResolvedValue({ memberAgentIds: ['a', 'b'] })
    getAgentById.mockImplementation(async (id: string) => {
      if (id === 'a') return { teamId: null }
      return null
    })
    expect(await computeAllowedTeamIds('c1')).toEqual([])
  })
})
