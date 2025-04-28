import { SettingsType } from '@shared/schemas/settings-schema'
import { type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  json,
  jsonb,
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

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
})

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
  webSearch: jsonb('webSearch').$type<SettingsType['webSearch']>()
})

export type Settings = InferSelectModel<typeof settings>
