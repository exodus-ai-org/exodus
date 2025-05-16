import { SettingsType } from '@shared/schemas/settings-schema'
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
  varchar
} from 'drizzle-orm/pg-core'

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

export const settings = pgTable('Setting', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  providerConfig:
    jsonb('providerConfig').$type<SettingsType['providerConfig']>(),
  providers: jsonb('providers').$type<SettingsType['providers']>(),
  mcpServers: text('mcpServers').default(''),
  audio: jsonb('audio').$type<SettingsType['audio']>(),
  fileUploadEndpoint: text('fileUploadEndpoint').default(''),
  assistantAvatar: text('assistantAvatar').default(''),
  googleCloud: jsonb('googleCloud').$type<SettingsType['googleCloud']>(),
  webSearch: jsonb('webSearch').$type<SettingsType['webSearch']>(),
  image: jsonb('image').$type<SettingsType['image']>()
})

export type Settings = InferSelectModel<typeof settings>

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
