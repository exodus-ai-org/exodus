import { fetcher } from '@shared/utils/http'

export type MemoryType =
  | 'preference'
  | 'goal'
  | 'environment'
  | 'skill'
  | 'project'
  | 'constraint'
export type MemorySource = 'explicit' | 'implicit' | 'system'

export interface MemoryItem {
  id: string
  userId: string
  type: MemoryType
  key: string
  value: Record<string, unknown>
  confidence: number | null
  source: MemorySource
  createdAt: string | null
  updatedAt: string | null
  lastUsedAt: string | null
  isActive: boolean | null
}

export const getMemories = (type?: MemoryType) => {
  const query = type ? `?type=${type}` : ''
  return fetcher<MemoryItem[]>(`/api/memory${query}`)
}

export const createMemory = (data: {
  type: MemoryType
  key: string
  value: Record<string, unknown>
  confidence?: number
  source?: MemorySource
}) => fetcher<MemoryItem>('/api/memory', { method: 'POST', body: data })

export const updateMemory = (
  id: string,
  data: Partial<{
    type: MemoryType
    key: string
    value: Record<string, unknown>
    confidence: number
    source: MemorySource
    isActive: boolean
  }>
) => fetcher<void>(`/api/memory/${id}`, { method: 'PATCH', body: data })

export const deleteMemory = (id: string, hard = false) =>
  fetcher<void>(`/api/memory/${id}${hard ? '?hard=true' : ''}`, {
    method: 'DELETE'
  })
