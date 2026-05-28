import {
  Agent,
  AgentMemory,
  Chat,
  Conversation,
  ConversationMessage,
  DeepResearch,
  DeepResearchMessage,
  KnowledgeDoc,
  McpServer,
  Message,
  Project,
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
  Conversation,
  ConversationMessage,
  DeepResearch,
  DeepResearchMessage,
  KnowledgeDoc,
  McpServer,
  Message,
  Project,
  Settings,
  Task,
  TaskExecution,
  TaskExecutionEvent,
  Vote
}
