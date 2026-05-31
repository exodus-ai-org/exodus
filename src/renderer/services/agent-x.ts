import { fetcher } from '@shared/utils/http'

import type { AgentData, TeamData } from '@/stores/agent-x'

const BASE = '/api/agent-x'

export const getAgents = () => fetcher<AgentData[]>(`${BASE}/agents`)

export const getTeams = () => fetcher<TeamData[]>(`${BASE}/teams`)
export const createTeamApi = (
  data: Partial<Omit<TeamData, 'id' | 'createdAt' | 'updatedAt'>>
) => fetcher<TeamData>(`${BASE}/teams`, { method: 'POST', body: data as never })
export const updateTeamApi = (id: string, data: Partial<TeamData>) =>
  fetcher<TeamData>(`${BASE}/teams/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteTeamApi = (id: string) =>
  fetcher<void>(`${BASE}/teams/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

export const createAgentApi = (
  data: Partial<Omit<AgentData, 'id' | 'createdAt' | 'updatedAt'>>
) =>
  fetcher<AgentData>(`${BASE}/agents`, { method: 'POST', body: data as never })
export const updateAgentApi = (id: string, data: Partial<AgentData>) =>
  fetcher<AgentData>(`${BASE}/agents/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteAgentApi = (id: string) =>
  fetcher<void>(`${BASE}/agents/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })
export const getAgentMemories = (id: string) =>
  fetcher<
    Array<{ id: string; key: string; value: unknown; createdAt: string }>
  >(`${BASE}/agents/${id}/memories`)
export const getAvailableSkills = () =>
  fetcher<Array<{ slug: string; name: string; isActive: boolean }>>(
    `${BASE}/available-skills`
  )
