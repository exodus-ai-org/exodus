import type {
  KnowledgeDocData,
  LightRagHealthDto
} from '@shared/types/knowledge-base'
import { fetcher } from '@shared/utils/http'

const BASE = '/api/knowledge-base'

export const getKnowledgeDocs = () =>
  fetcher<KnowledgeDocData[]>(`${BASE}/documents`)

export const createKnowledgeDoc = (data: { title: string; content: string }) =>
  fetcher<KnowledgeDocData>(`${BASE}/documents`, { method: 'POST', body: data })

export const updateKnowledgeDoc = (
  id: string,
  data: Partial<{ title: string; content: string }>
) =>
  fetcher<KnowledgeDocData>(`${BASE}/documents/${id}`, {
    method: 'PUT',
    body: data
  })

export const deleteKnowledgeDoc = (id: string) =>
  fetcher<void>(`${BASE}/documents/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

export const reindexAll = () =>
  fetcher<{ count: number }>(`${BASE}/documents/reindex-all`, {
    method: 'POST'
  })

export const testKnowledgeBaseConnection = () =>
  fetcher<LightRagHealthDto>(`${BASE}/test-connection`, { method: 'POST' })
