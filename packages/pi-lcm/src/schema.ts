import type { InferSelectModel } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'

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

export const lcmSummary = pgTable('lcm_summary', {
  id: text('id').primaryKey(),
  chatId: uuid('chat_id').notNull(),
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

export const lcmSummaryMessages = pgTable(
  'lcm_summary_messages',
  {
    summaryId: text('summary_id')
      .notNull()
      .references(() => lcmSummary.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').notNull()
  },
  (t) => [primaryKey({ columns: [t.summaryId, t.messageId] })]
)

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

export const lcmContextItems = pgTable(
  'lcm_context_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    kind: text('kind').notNull().$type<'message' | 'summary'>(),
    refId: text('ref_id').notNull(),
    tokenCount: integer('token_count')
  },
  (t) => [index('lcm_context_chat_idx').on(t.chatId, t.ordinal)]
)

export type LcmContextItem = InferSelectModel<typeof lcmContextItems>
