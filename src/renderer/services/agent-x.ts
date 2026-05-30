import { fetcher } from '@shared/utils/http'

import type { AgentData } from '@/stores/agent-x'

const BASE = '/api/agent-x'

export const getAgents = () => fetcher<AgentData[]>(`${BASE}/agents`)
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
