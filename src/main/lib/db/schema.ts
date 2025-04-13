import { type InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  json,
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
  title: text('title').notNull()
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

export const setting = pgTable('Setting', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  provider: varchar('provider').default(''),
  chatModel: varchar('chatModel').default(''),
  reasoningModel: varchar('reasoningModel').default(''),
  openaiApiKey: varchar('openaiApiKey').default(''),
  openaiBaseUrl: varchar('openaiBaseUrl').default(''),
  azureOpenaiApiKey: varchar('azureOpenaiApiKey').default(''),
  azureOpenAiEndpoint: varchar('azureOpenAiEndpoint').default(''),
  azureOpenAiApiVersion: varchar('azureOpenAiApiVersion').default(''),
  anthropicApiKey: varchar('anthropicApiKey').default(''),
  anthropicBaseUrl: varchar('anthropicBaseUrl').default(''),
  googleApiKey: varchar('googleApiKey').default(''),
  googleBaseUrl: varchar('googleBaseUrl').default(''),
  xAiApiKey: varchar('xAiApiKey').default(''),
  xAiBaseUrl: varchar('xAiBaseUrl').default(''),
  deepSeekApiKey: varchar('deepSeekApiKey').default(''),
  deepSeekBaseUrl: varchar('deepSeekBaseUrl').default(''),
  ollamaBaseUrl: varchar('ollamaBaseUrl').default(''),
  mcpServers: varchar('mcpServers').default(''),
  speechToTextModel: varchar('speechToTextModel').default(''),
  textToSpeechModel: varchar('textToSpeechModel').default(''),
  textToSpeechVoice: varchar('textToSpeechVoice').default(''),
  fileUploadEndpoint: varchar('fileUploadEndpoint').default(''),
  assistantAvatar: varchar('assistantAvatar').default(''),
  googleSearchApiKey: varchar('googleSearchApiKey').default(''),
  googleCseId: varchar('googleCseId').default('')
})

export type Setting = InferSelectModel<typeof setting>
