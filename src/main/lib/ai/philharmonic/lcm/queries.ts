// src/main/lib/ai/philharmonic/lcm/queries.ts
import { eq } from 'drizzle-orm'

import { db } from '../../../db/db'
import {
  philharmonicSessionSummary,
  type PhilharmonicSessionSummary
} from '../../../db/schema'

export async function getSessionSummary(
  conversationId: string
): Promise<PhilharmonicSessionSummary | null> {
  const [row] = await db
    .select()
    .from(philharmonicSessionSummary)
    .where(eq(philharmonicSessionSummary.conversationId, conversationId))
    .limit(1)
  return row ?? null
}

export interface UpsertSummaryArgs {
  conversationId: string
  content: string
  coversThroughMessageId: string
  tokenCount: number
  messageCount: number
}

/**
 * Upsert a conversation's rolling summary. One row per conversation thanks
 * to the unique index on conversationId.
 */
export async function upsertSessionSummary(
  args: UpsertSummaryArgs
): Promise<PhilharmonicSessionSummary> {
  const existing = await getSessionSummary(args.conversationId)
  if (existing) {
    const [row] = await db
      .update(philharmonicSessionSummary)
      .set({
        content: args.content,
        coversThroughMessageId: args.coversThroughMessageId,
        tokenCount: args.tokenCount,
        messageCount: args.messageCount,
        updatedAt: new Date()
      })
      .where(eq(philharmonicSessionSummary.id, existing.id))
      .returning()
    return row
  }
  const [row] = await db
    .insert(philharmonicSessionSummary)
    .values({
      conversationId: args.conversationId,
      content: args.content,
      coversThroughMessageId: args.coversThroughMessageId,
      tokenCount: args.tokenCount,
      messageCount: args.messageCount
    })
    .returning()
  return row
}
