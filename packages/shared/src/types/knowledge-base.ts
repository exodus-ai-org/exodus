export type KnowledgeIndexStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'stale'

export interface KnowledgeDocData {
  id: string
  title: string
  content: string
  indexStatus: KnowledgeIndexStatus
  indexError: string | null
  createdAt: string
  updatedAt: string
}

export interface LightRagHealthDto {
  status: string
  llmModel?: string
  embeddingModel?: string
  embeddingDim?: number
  documentCount?: number
}
