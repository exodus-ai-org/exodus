import { JSONRPCNotification } from '@ai-sdk/mcp'
import {
  AudioSchema,
  DeepResearchSchema,
  GoogleCloudSchema,
  ImageSchema,
  ProviderConfigSchema,
  ProvidersSchema,
  S3Schema,
  WebSearchSchema
} from '@shared/schemas/setting-schema'
import { WebSearchResult } from '@shared/types/web-search'
import { sql, type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
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

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  title: text('title').notNull(),
  favorite: boolean().default(false)
})

export type Chat = InferSelectModel<typeof chat>

export const message = pgTable(
  'Message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    role: varchar('role').notNull(),
    parts: json('parts').notNull(),
    attachments: json('attachments').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull()
  },
  (table) => [
    index('message_search_index').using(
      'gin',
      sql`to_tsvector('simple', ${table.parts})`
    )
  ]
)

export type DBMessage = InferSelectModel<typeof message>
export type Message = DBMessage

export const vote = pgTable(
  'Vote',
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

export const setting = pgTable('Setting', {
  id: text('id').primaryKey(),
  providerConfig:
    jsonb('providerConfig').$type<z.infer<typeof ProviderConfigSchema>>(),
  providers: jsonb('providers').$type<z.infer<typeof ProvidersSchema>>(),
  mcpServers: text('mcpServers').default(''),
  audio: jsonb('audio').$type<z.infer<typeof AudioSchema>>(),
  assistantAvatar: text('assistantAvatar').default(''),
  googleCloud: jsonb('googleCloud').$type<z.infer<typeof GoogleCloudSchema>>(),
  webSearch: jsonb('webSearch').$type<z.infer<typeof WebSearchSchema>>(),
  image: jsonb('image').$type<z.infer<typeof ImageSchema>>(),
  deepResearch:
    jsonb('deepResearch').$type<z.infer<typeof DeepResearchSchema>>(),
  s3: jsonb('s3').$type<z.infer<typeof S3Schema>>(),
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

export const deepResearch = pgTable('DeepResearch', {
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

export const deepResearchMessage = pgTable('DeepResearchMessage', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  deepResearchId: uuid('deepResearchId')
    .notNull()
    .references(() => deepResearch.id),
  message: json('message').notNull().$type<JSONRPCNotification>(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
})

export type DeepResearchMessage = InferSelectModel<typeof deepResearchMessage>

export const resource = pgTable('Resource', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type Resources = InferSelectModel<typeof resource>

export const embedding = pgTable(
  'Embedding',
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
