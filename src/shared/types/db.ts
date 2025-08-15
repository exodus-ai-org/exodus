import {
  Chat,
  DeepResearch,
  DeepResearchMessage,
  Embedding,
  Message,
  Resources,
  Settings,
  Vote
} from 'src/main/lib/db/schema'

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export type {
  Chat,
  DeepResearch,
  DeepResearchMessage,
  Embedding,
  Message,
  Resources,
  Settings,
  Vote
}
