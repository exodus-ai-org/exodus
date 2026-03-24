import {
  Agent,
  AgentMemory,
  Chat,
  DeepResearch,
  DeepResearchMessage,
  Department,
  McpServer,
  Message,
  Settings,
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
  McpServer,
  Message,
  Settings,
  Task,
  TaskExecution,
  TaskExecutionEvent,
  Vote
}
