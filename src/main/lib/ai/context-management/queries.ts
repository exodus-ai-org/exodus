import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../db/db'
import {
  lcmContextItems,
  lcmSummary,
  lcmSummaryMessages,
  lcmSummaryParents,
  message,
  type LcmContextItem,
  type LcmSummary
} from '../../db/schema'

// ─── Context Items ───────────────────────────────────────────────────────────

export async function getContextItems(
  chatId: string
): Promise<LcmContextItem[]> {
  return db
    .select()
    .from(lcmContextItems)
    .where(eq(lcmContextItems.chatId, chatId))
    .orderBy(asc(lcmContextItems.ordinal))
}

export async function initContextItems(
  chatId: string,
  items: Array<{
    kind: 'message' | 'summary'
    refId: string
    tokenCount: number
  }>
): Promise<void> {
  if (items.length === 0) return
  await db.insert(lcmContextItems).values(
    items.map((item, i) => ({
      chatId,
      ordinal: i,
      kind: item.kind,
      refId: item.refId,
      tokenCount: item.tokenCount
    }))
  )
}

export async function appendContextItem(
  chatId: string,
  kind: 'message' | 'summary',
  refId: string,
  tokenCount: number
): Promise<void> {
  // Get max ordinal for this chat
  const [row] = await db
    .select({
      maxOrdinal: sql<number>`COALESCE(MAX(${lcmContextItems.ordinal}), -1)`
    })
    .from(lcmContextItems)
    .where(eq(lcmContextItems.chatId, chatId))

  const nextOrdinal = (row?.maxOrdinal ?? -1) + 1
  await db.insert(lcmContextItems).values({
    chatId,
    ordinal: nextOrdinal,
    kind,
    refId,
    tokenCount
  })
}

/** Replace a range of context items [fromOrdinal, toOrdinal] with a single summary item */
export async function replaceContextRange(
  chatId: string,
  fromOrdinal: number,
  toOrdinal: number,
  summaryId: string,
  tokenCount: number
): Promise<void> {
  await db
    .delete(lcmContextItems)
    .where(
      and(
        eq(lcmContextItems.chatId, chatId),
        sql`${lcmContextItems.ordinal} >= ${fromOrdinal}`,
        sql`${lcmContextItems.ordinal} <= ${toOrdinal}`
      )
    )

  // Re-fetch and renumber items after the deleted range
  const remaining = await db
    .select()
    .from(lcmContextItems)
    .where(eq(lcmContextItems.chatId, chatId))
    .orderBy(asc(lcmContextItems.ordinal))

  // Insert summary at fromOrdinal, then re-insert remaining with new ordinals
  await db.insert(lcmContextItems).values({
    chatId,
    ordinal: fromOrdinal,
    kind: 'summary',
    refId: summaryId,
    tokenCount
  })

  // Update subsequent items' ordinals (shift by fromOrdinal + 1 - their previous count)
  if (remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      await db
        .update(lcmContextItems)
        .set({ ordinal: fromOrdinal + 1 + i })
        .where(eq(lcmContextItems.id, remaining[i].id))
    }
  }
}

// ─── Summaries ───────────────────────────────────────────────────────────────

export async function insertSummary(
  summary: Omit<LcmSummary, 'createdAt'>
): Promise<void> {
  await db.insert(lcmSummary).values(summary)
}

export async function getSummaryById(id: string): Promise<LcmSummary | null> {
  const [row] = await db.select().from(lcmSummary).where(eq(lcmSummary.id, id))
  return row ?? null
}

export async function getSummariesByIds(ids: string[]): Promise<LcmSummary[]> {
  if (ids.length === 0) return []
  return db.select().from(lcmSummary).where(inArray(lcmSummary.id, ids))
}

export async function getLeafSummariesForChat(
  chatId: string
): Promise<LcmSummary[]> {
  return db
    .select()
    .from(lcmSummary)
    .where(and(eq(lcmSummary.chatId, chatId), eq(lcmSummary.depth, 0)))
    .orderBy(asc(lcmSummary.earliestAt))
}

/** Get most recent leaf summary for continuity context */
export async function getLatestLeafSummary(
  chatId: string
): Promise<LcmSummary | null> {
  const [row] = await db
    .select()
    .from(lcmSummary)
    .where(and(eq(lcmSummary.chatId, chatId), eq(lcmSummary.depth, 0)))
    .orderBy(desc(lcmSummary.latestAt))
    .limit(1)
  return row ?? null
}

export async function linkSummaryToMessages(
  summaryId: string,
  messageIds: string[]
): Promise<void> {
  if (messageIds.length === 0) return
  await db
    .insert(lcmSummaryMessages)
    .values(messageIds.map((messageId) => ({ summaryId, messageId })))
}

export async function linkSummaryToParents(
  childId: string,
  parentIds: string[]
): Promise<void> {
  if (parentIds.length === 0) return
  await db
    .insert(lcmSummaryParents)
    .values(parentIds.map((parentId) => ({ childId, parentId })))
}

export async function getParentIds(childId: string): Promise<string[]> {
  const rows = await db
    .select({ parentId: lcmSummaryParents.parentId })
    .from(lcmSummaryParents)
    .where(eq(lcmSummaryParents.childId, childId))
  return rows.map((r) => r.parentId)
}

export async function getChildIds(parentId: string): Promise<string[]> {
  const rows = await db
    .select({ childId: lcmSummaryParents.childId })
    .from(lcmSummaryParents)
    .where(eq(lcmSummaryParents.parentId, parentId))
  return rows.map((r) => r.childId)
}

export async function getSourceMessageIds(
  summaryId: string
): Promise<string[]> {
  const rows = await db
    .select({ messageId: lcmSummaryMessages.messageId })
    .from(lcmSummaryMessages)
    .where(eq(lcmSummaryMessages.summaryId, summaryId))
  return rows.map((r) => r.messageId)
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessagesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db.select().from(message).where(inArray(message.id, ids))
}

export async function getMessageById(id: string) {
  const [row] = await db.select().from(message).where(eq(message.id, id))
  return row ?? null
}

/** Full-text + regex search across summaries for a chat */
export async function searchSummaries(
  chatId: string,
  pattern: string
): Promise<Array<{ summary: LcmSummary; snippet: string }>> {
  const summaries = await db
    .select()
    .from(lcmSummary)
    .where(eq(lcmSummary.chatId, chatId))
    .orderBy(desc(lcmSummary.latestAt))

  const results: Array<{ summary: LcmSummary; snippet: string }> = []
  let regex: RegExp | null = null
  try {
    regex = new RegExp(pattern, 'gi')
  } catch {
    // Fall back to literal string search
  }

  for (const s of summaries) {
    let match = false
    let snippet = ''

    if (regex) {
      const m = s.content.match(regex)
      if (m) {
        match = true
        const idx = s.content.toLowerCase().indexOf(m[0].toLowerCase())
        const start = Math.max(0, idx - 80)
        const end = Math.min(s.content.length, idx + 160)
        snippet =
          (start > 0 ? '...' : '') +
          s.content.slice(start, end) +
          (end < s.content.length ? '...' : '')
      }
    } else {
      const lower = s.content.toLowerCase()
      const patternLower = pattern.toLowerCase()
      const idx = lower.indexOf(patternLower)
      if (idx !== -1) {
        match = true
        const start = Math.max(0, idx - 80)
        const end = Math.min(s.content.length, idx + 160)
        snippet =
          (start > 0 ? '...' : '') +
          s.content.slice(start, end) +
          (end < s.content.length ? '...' : '')
      }
    }

    if (match) results.push({ summary: s, snippet })
  }

  return results
}
