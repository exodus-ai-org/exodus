import {
  Agent,
  AgentMemory,
  Chat,
  DeepResearch,
  DeepResearchMessage,
  Department,
  Embedding,
  McpServer,
  Message,
  Resources,
  Setting,
  Task,
  TaskExecution,
  TaskExecutionEvent,
  Vote
} from 'src/main/lib/db/schema'

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export type {
  Agent,
  AgentMemory,
  Chat,
  DeepResearch,
  DeepResearchMessage,
  Department,
  Embedding,
  McpServer,
  Message,
  Resources,
  Setting,
  Task,
  TaskExecution,
  TaskExecutionEvent,
  Vote
}
