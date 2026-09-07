import { fetcher } from '@shared/utils/http'

export type MemorySection = 'profile' | 'topic' | 'person'
export type MemorySource = 'explicit' | 'implicit' | 'system'

export interface MemoryItem {
  id: string
  userId: string
  section: MemorySection
  key: string
  summary: string
  details: string[]
  confidence: number | null
  source: MemorySource
  createdAt: string | null
  updatedAt: string | null
  lastUsedAt: string | null
  isActive: boolean | null
}

export const getMemories = (section?: MemorySection) => {
  const query = section ? `?section=${section}` : ''
  return fetcher<MemoryItem[]>(`/api/memory${query}`)
}

export const createMemory = (data: {
  section: MemorySection
  key: string
  summary: string
  details?: string[]
  confidence?: number
  source?: MemorySource
}) => fetcher<MemoryItem>('/api/memory', { method: 'POST', body: data })

export const updateMemory = (
  id: string,
  data: Partial<{
    section: MemorySection
    key: string
    summary: string
    details: string[]
    confidence: number
    source: MemorySource
    isActive: boolean
  }>
) => fetcher<void>(`/api/memory/${id}`, { method: 'PATCH', body: data })

export const deleteMemory = (id: string, hard = false) =>
  fetcher<void>(`/api/memory/${id}${hard ? '?hard=true' : ''}`, {
    method: 'DELETE'
  })
