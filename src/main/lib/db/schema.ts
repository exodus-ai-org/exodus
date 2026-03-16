import type { Usage } from '@mariozechner/pi-ai'
import {
  AudioSchema,
  DeepResearchSchema,
  GoogleCloudSchema,
  ImageSchema,
  MemoryLayerSchema,
  ProviderConfigSchema,
  ProvidersSchema,
  S3Schema,
  ToolsSchema,
  WebSearchSchema
} from '@shared/schemas/setting-schema'
import { WebSearchResult } from '@shared/types/web-search'
import { sql, type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
  vector
} from 'drizzle-orm/pg-core'
import z from 'zod'

export const chat = pgTable('chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  title: text('title').notNull(),
  favorite: boolean().default(false)
})

export type Chat = InferSelectModel<typeof chat>

export const message = pgTable(
  'message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    role: varchar('role').notNull(), // 'user' | 'assistant' | 'toolResult'
    content: jsonb('content').notNull(), // content array for the message
    // assistant-specific fields
    usage: jsonb('usage').$type<Usage>(),
    api: varchar('api'),
    provider: varchar('provider'),
    model: varchar('model'),
    stopReason: varchar('stopReason'),
    errorMessage: varchar('errorMessage'),
    // toolResult-specific fields
    toolCallId: varchar('toolCallId'),
    toolName: varchar('toolName'),
    details: jsonb('details'),
    isError: boolean('isError'),
    createdAt: timestamp('createdAt').defaultNow().notNull()
  },
  (table) => [
    index('message_search_index').using(
      'gin',
      sql`to_tsvector('simple', ${table.content})`
    )
  ]
)

export type DBMessage = InferSelectModel<typeof message>
export type Message = DBMessage

export const vote = pgTable(
  'vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull()
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] })
    }
  }
)

export type Vote = InferSelectModel<typeof vote>

export const setting = pgTable('setting', {
  id: text('id').primaryKey(),
  providerConfig:
    jsonb('providerConfig').$type<z.infer<typeof ProviderConfigSchema>>(),
  providers: jsonb('providers').$type<z.infer<typeof ProvidersSchema>>(),
  mcpServers: text('mcpServers').default(''),
  tools: jsonb('tools').$type<z.infer<typeof ToolsSchema>>(),
  audio: jsonb('audio').$type<z.infer<typeof AudioSchema>>(),
  assistantAvatar: text('assistantAvatar').default(''),
  googleCloud: jsonb('googleCloud').$type<z.infer<typeof GoogleCloudSchema>>(),
  webSearch: jsonb('webSearch').$type<z.infer<typeof WebSearchSchema>>(),
  image: jsonb('image').$type<z.infer<typeof ImageSchema>>(),
  deepResearch:
    jsonb('deepResearch').$type<z.infer<typeof DeepResearchSchema>>(),
  s3: jsonb('s3').$type<z.infer<typeof S3Schema>>(),
  autoUpdate: boolean('autoUpdate').default(true),
  memoryLayer: jsonb('memoryLayer').$type<z.infer<typeof MemoryLayerSchema>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export type Setting = InferSelectModel<typeof setting>

export const jobStatusEnum = pgEnum('jobStatus', [
  'streaming',
  'archived',
  'failed',
  'terminated'
])

export const deepResearch = pgTable('deep_research', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  toolCallId: text('toolCallId').notNull(),
  title: text('title'),
  jobStatus: jobStatusEnum().notNull(),
  finalReport: text('finalReport'),
  webSources: json('webSources').$type<WebSearchResult[]>(),
  startTime: timestamp('startTime').defaultNow().notNull(),
  endTime: timestamp('endTime').defaultNow()
})

export type DeepResearch = InferSelectModel<typeof deepResearch>

export const deepResearchMessage = pgTable('deep_research_message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  deepResearchId: uuid('deepResearchId')
    .notNull()
    .references(() => deepResearch.id),
  message: json('message').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
})

export type DeepResearchMessage = InferSelectModel<typeof deepResearchMessage>

export const resource = pgTable('resource', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type Resources = InferSelectModel<typeof resource>

export const embedding = pgTable(
  'embedding',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    resourceId: uuid('resourceId').references(() => resource.id, {
      onDelete: 'cascade'
    }),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull()
  },
  (table) => [
    index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    )
  ]
)

export type Embedding = InferSelectModel<typeof embedding>

// ─── MCP Registry ───────────────────────────────────────────────────────────

export const mcpServer = pgTable('mcp_server', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').default(''),
  command: text('command').notNull(),
  args: jsonb('args').$type<string[]>().default([]),
  env: jsonb('env').$type<Record<string, string>>(),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type McpServer = InferSelectModel<typeof mcpServer>

// ─── Agent X ────────────────────────────────────────────────────────────────

export const department = pgTable('department', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('building-2'),
  skillSlugs: jsonb('skillSlugs').$type<string[]>().default([]),
  mcpServerNames: jsonb('mcpServerNames').$type<string[]>().default([]),
  position: jsonb('position').$type<{ x: number; y: number }>(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type Department = InferSelectModel<typeof department>

export const agent = pgTable('agent', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  departmentId: uuid('departmentId').references(() => department.id, {
    onDelete: 'set null'
  }),
  name: text('name').notNull(),
  description: text('description').default(''),
  systemPrompt: text('systemPrompt').default(''),
  toolAllowList: jsonb('toolAllowList').$type<string[]>().default([]),
  skillSlugs: jsonb('skillSlugs').$type<string[]>().default([]),
  mcpServerNames: jsonb('mcpServerNames').$type<string[]>().default([]),
  model: text('model'),
  provider: text('provider'),
  collaboratorIds: jsonb('collaboratorIds').$type<string[]>().default([]),
  position: jsonb('position').$type<{ x: number; y: number }>(),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type Agent = InferSelectModel<typeof agent>

export const agentMemorySourceEnum = pgEnum('agent_memory_source', [
  'conversation',
  'task',
  'system'
])

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  source: agentMemorySourceEnum('source').notNull().default('task'),
  confidence: real('confidence').default(0.8),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type AgentMemory = InferSelectModel<typeof agentMemory>

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'waiting_for_user'
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent'
])

export const task = pgTable('task', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  parentTaskId: uuid('parentTaskId'),
  title: text('title').notNull(),
  description: text('description').default(''),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  assignedDepartmentId: uuid('assignedDepartmentId').references(
    () => department.id
  ),
  assignedAgentId: uuid('assignedAgentId').references(() => agent.id),
  input: jsonb('input').$type<Record<string, unknown>>(),
  output: jsonb('output').$type<Record<string, unknown>>(),
  maxRetries: real('maxRetries').default(1),
  retryCount: real('retryCount').default(0),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt')
})

export type Task = InferSelectModel<typeof task>

export const executionStatusEnum = pgEnum('execution_status', [
  'running',
  'completed',
  'failed'
])

export const taskExecution = pgTable('task_execution', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  taskId: uuid('taskId')
    .notNull()
    .references(() => task.id, { onDelete: 'cascade' }),
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id),
  status: executionStatusEnum('status').notNull().default('running'),
  startedAt: timestamp('startedAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
  error: text('error'),
  tokenUsage: jsonb('tokenUsage').$type<{
    inputTokens: number
    outputTokens: number
  }>()
})

export type TaskExecution = InferSelectModel<typeof taskExecution>

export const taskExecutionEvent = pgTable('task_execution_event', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  executionId: uuid('executionId')
    .notNull()
    .references(() => taskExecution.id, { onDelete: 'cascade' }),
  eventType: text('eventType').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
})

export type TaskExecutionEvent = InferSelectModel<typeof taskExecutionEvent>

// ─── Memory & Personalization ───────────────────────────────────────────────

export const memoryTypeEnum = pgEnum('memory_type', [
  'preference',
  'goal',
  'environment',
  'skill',
  'project',
  'constraint'
])

export const memorySourceEnum = pgEnum('memory_source', [
  'explicit',
  'implicit',
  'system'
])

export const memory = pgTable('memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  type: memoryTypeEnum('type').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  confidence: real('confidence').default(0.8),
  source: memorySourceEnum('source').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').default(true)
})

export const sessionSummary = pgTable('session_summary', {
  sessionId: uuid('session_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  summary: text('summary').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const memoryUsageLog = pgTable('memory_usage_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  memoryId: uuid('memory_id'),
  sessionId: uuid('session_id'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow()
})

// ─── LCM (Lossless Context Management) ──────────────────────────────────────

// DAG nodes: leaf summaries (depth=0) and condensed summaries (depth>=1)
export const lcmSummary = pgTable('lcm_summary', {
  id: text('id').primaryKey(), // 'sum_' + 16 hex chars (SHA-256 of content+ts)
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull().$type<'leaf' | 'condensed'>(),
  depth: integer('depth').notNull().default(0),
  content: text('content').notNull(),
  tokenCount: integer('token_count').notNull(),
  descendantCount: integer('descendant_count').notNull().default(0),
  earliestAt: timestamp('earliest_at').notNull(),
  latestAt: timestamp('latest_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export type LcmSummary = InferSelectModel<typeof lcmSummary>

// Leaf summary → source messages (many-to-many)
export const lcmSummaryMessages = pgTable(
  'lcm_summary_messages',
  {
    summaryId: text('summary_id')
      .notNull()
      .references(() => lcmSummary.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' })
  },
  (t) => [primaryKey({ columns: [t.summaryId, t.messageId] })]
)

// Condensed summary → parent summaries (DAG edges)
export const lcmSummaryParents = pgTable(
  'lcm_summary_parents',
  {
    childId: text('child_id')
      .notNull()
      .references(() => lcmSummary.id, { onDelete: 'cascade' }),
    parentId: text('parent_id')
      .notNull()
      .references(() => lcmSummary.id, { onDelete: 'cascade' })
  },
  (t) => [primaryKey({ columns: [t.childId, t.parentId] })]
)

// Ordered context sequence per chat session (messages + summaries interleaved)
export const lcmContextItems = pgTable(
  'lcm_context_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    kind: text('kind').notNull().$type<'message' | 'summary'>(),
    refId: text('ref_id').notNull(), // message.id or lcmSummary.id
    tokenCount: integer('token_count')
  },
  (t) => [index('lcm_context_chat_idx').on(t.chatId, t.ordinal)]
)

export type LcmContextItem = InferSelectModel<typeof lcmContextItems>
