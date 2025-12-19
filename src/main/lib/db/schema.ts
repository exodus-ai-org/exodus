import {
  audioSchema,
  deepResearchSchema,
  googleCloudSchema,
  imageSchema,
  mem0Schema,
  providerConfigSchema,
  providersSchema,
  s3Schema,
  webSearchSchema
} from '@shared/schemas/setting-schema'
import { WebSearchResult } from '@shared/types/web-search'
import { JSONRPCNotification } from 'ai'
import { sql, type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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

export type Message = InferSelectModel<typeof message>

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
    jsonb('providerConfig').$type<z.infer<typeof providerConfigSchema>>(),
  providers: jsonb('providers').$type<z.infer<typeof providersSchema>>(),
  mcpServers: text('mcpServers').default(''),
  audio: jsonb('audio').$type<z.infer<typeof audioSchema>>(),
  assistantAvatar: text('assistantAvatar').default(''),
  googleCloud: jsonb('googleCloud').$type<z.infer<typeof googleCloudSchema>>(),
  webSearch: jsonb('webSearch').$type<z.infer<typeof webSearchSchema>>(),
  image: jsonb('image').$type<z.infer<typeof imageSchema>>(),
  deepResearch:
    jsonb('deepResearch').$type<z.infer<typeof deepResearchSchema>>(),
  mem0: jsonb('mem0').$type<z.infer<typeof mem0Schema>>(),
  s3: jsonb('s3').$type<z.infer<typeof s3Schema>>(),
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
