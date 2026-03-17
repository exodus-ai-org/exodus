import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb, getMessageTable } from '../init'
import {
  lcmContextItems,
  lcmSummary,
  lcmSummaryMessages,
  lcmSummaryParents,
  type LcmContextItem,
  type LcmSummary
} from '../schema'

// ─── Context Items ───────────────────────────────────────────────────────────

export async function getContextItems(
  chatId: string
): Promise<LcmContextItem[]> {
  const db = getDb()
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
  const db = getDb()
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
  const db = getDb()
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

export async function replaceContextRange(
  chatId: string,
  fromOrdinal: number,
  toOrdinal: number,
  summaryId: string,
  tokenCount: number
): Promise<void> {
  const db = getDb()
  await db
    .delete(lcmContextItems)
    .where(
      and(
        eq(lcmContextItems.chatId, chatId),
        sql`${lcmContextItems.ordinal} >= ${fromOrdinal}`,
        sql`${lcmContextItems.ordinal} <= ${toOrdinal}`
      )
    )

  const after = await db
    .select()
    .from(lcmContextItems)
    .where(
      and(
        eq(lcmContextItems.chatId, chatId),
        sql`${lcmContextItems.ordinal} > ${toOrdinal}`
      )
    )
    .orderBy(asc(lcmContextItems.ordinal))

  await db.insert(lcmContextItems).values({
    chatId,
    ordinal: fromOrdinal,
    kind: 'summary',
    refId: summaryId,
    tokenCount
  })

  for (let i = 0; i < after.length; i++) {
    await db
      .update(lcmContextItems)
      .set({ ordinal: fromOrdinal + 1 + i })
      .where(eq(lcmContextItems.id, after[i].id))
  }
}

// ─── Summaries ───────────────────────────────────────────────────────────────

export async function insertSummary(
  summary: Omit<LcmSummary, 'createdAt'>
): Promise<void> {
  const db = getDb()
  await db.insert(lcmSummary).values(summary)
}

export async function getSummaryById(id: string): Promise<LcmSummary | null> {
  const db = getDb()
  const [row] = await db.select().from(lcmSummary).where(eq(lcmSummary.id, id))
  return row ?? null
}

export async function getSummariesByIds(ids: string[]): Promise<LcmSummary[]> {
  if (ids.length === 0) return []
  const db = getDb()
  return db.select().from(lcmSummary).where(inArray(lcmSummary.id, ids))
}

export async function getLeafSummariesForChat(
  chatId: string
): Promise<LcmSummary[]> {
  const db = getDb()
  return db
    .select()
    .from(lcmSummary)
    .where(and(eq(lcmSummary.chatId, chatId), eq(lcmSummary.depth, 0)))
    .orderBy(asc(lcmSummary.earliestAt))
}

export async function getLatestLeafSummary(
  chatId: string
): Promise<LcmSummary | null> {
  const db = getDb()
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
  const db = getDb()
  await db
    .insert(lcmSummaryMessages)
    .values(messageIds.map((messageId) => ({ summaryId, messageId })))
}

export async function linkSummaryToParents(
  childId: string,
  parentIds: string[]
): Promise<void> {
  if (parentIds.length === 0) return
  const db = getDb()
  await db
    .insert(lcmSummaryParents)
    .values(parentIds.map((parentId) => ({ childId, parentId })))
}

export async function getParentIds(childId: string): Promise<string[]> {
  const db = getDb()
  const rows = await db
    .select({ parentId: lcmSummaryParents.parentId })
    .from(lcmSummaryParents)
    .where(eq(lcmSummaryParents.childId, childId))
  return rows.map((r: { parentId: string }) => r.parentId)
}

export async function getChildIds(parentId: string): Promise<string[]> {
  const db = getDb()
  const rows = await db
    .select({ childId: lcmSummaryParents.childId })
    .from(lcmSummaryParents)
    .where(eq(lcmSummaryParents.parentId, parentId))
  return rows.map((r: { childId: string }) => r.childId)
}

export async function getSourceMessageIds(
  summaryId: string
): Promise<string[]> {
  const db = getDb()
  const rows = await db
    .select({ messageId: lcmSummaryMessages.messageId })
    .from(lcmSummaryMessages)
    .where(eq(lcmSummaryMessages.summaryId, summaryId))
  return rows.map((r: { messageId: string }) => r.messageId)
}

// ─── Messages (via injected messageTable) ────────────────────────────────────

export async function getMessagesByIds(ids: string[]) {
  if (ids.length === 0) return []
  const db = getDb()
  const mt = getMessageTable()
  return db.select().from(mt).where(inArray(mt.id, ids))
}

export async function getMessageById(id: string) {
  const db = getDb()
  const mt = getMessageTable()
  const [row] = await db.select().from(mt).where(eq(mt.id, id))
  return row ?? null
}

export async function searchMessages(
  chatId: string,
  pattern: string
): Promise<
  Array<{ messageId: string; role: string; createdAt: Date; snippet: string }>
> {
  const db = getDb()
  const mt = getMessageTable()
  const messages = await db
    .select()
    .from(mt)
    .where(eq(mt.chatId, chatId))
    .orderBy(desc(mt.createdAt))

  const results: Array<{
    messageId: string
    role: string
    createdAt: Date
    snippet: string
  }> = []
  let regex: RegExp | null = null
  try {
    regex = new RegExp(pattern, 'gi')
  } catch {
    // Fall back to literal string search
  }

  for (const m of messages) {
    let text = ''
    if (Array.isArray(m.content)) {
      text = (m.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === 'text' && typeof c.text === 'string')
        .map((c) => (c as { text: string }).text)
        .join(' ')
    } else if (typeof m.content === 'string') {
      text = m.content
    }

    let match = false
    let snippet = ''

    if (regex) {
      regex.lastIndex = 0
      const hit = regex.exec(text)
      if (hit) {
        match = true
        const idx = hit.index
        const start = Math.max(0, idx - 80)
        const end = Math.min(text.length, idx + 160)
        snippet =
          (start > 0 ? '...' : '') +
          text.slice(start, end) +
          (end < text.length ? '...' : '')
      }
    } else {
      const lower = text.toLowerCase()
      const patternLower = pattern.toLowerCase()
      const idx = lower.indexOf(patternLower)
      if (idx !== -1) {
        match = true
        const start = Math.max(0, idx - 80)
        const end = Math.min(text.length, idx + 160)
        snippet =
          (start > 0 ? '...' : '') +
          text.slice(start, end) +
          (end < text.length ? '...' : '')
      }
    }

    if (match) {
      results.push({
        messageId: m.id,
        role: m.role,
        createdAt: m.createdAt,
        snippet
      })
    }
  }

  return results
}

export async function searchSummaries(
  chatId: string,
  pattern: string
): Promise<Array<{ summary: LcmSummary; snippet: string }>> {
  const db = getDb()
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
    // literal fallback
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
