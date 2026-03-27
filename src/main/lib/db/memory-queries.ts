import { and, desc, eq } from 'drizzle-orm'
import { v4 as uuidV4 } from 'uuid'

import { db } from './db'
import { memory, memoryUsageLog, sessionSummary } from './schema'

export type MemoryType =
  | 'preference'
  | 'goal'
  | 'environment'
  | 'skill'
  | 'project'
  | 'constraint'
export type MemorySource = 'explicit' | 'implicit' | 'system'

export interface MemoryRow {
  id: string
  userId: string
  type: MemoryType
  key: string
  value: Record<string, unknown>
  confidence: number | null
  source: MemorySource
  createdAt: Date | null
  updatedAt: Date | null
  lastUsedAt: Date | null
  isActive: boolean | null
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createMemory(data: {
  userId: string
  type: MemoryType
  key: string
  value: Record<string, unknown>
  confidence?: number
  source: MemorySource
}): Promise<MemoryRow> {
  const [row] = await db
    .insert(memory)
    .values({
      id: uuidV4(),
      userId: data.userId,
      type: data.type,
      key: data.key,
      value: data.value,
      confidence: data.confidence ?? 0.8,
      source: data.source
    })
    .returning()
  return row as unknown as MemoryRow
}

export async function getActiveMemories(userId: string): Promise<MemoryRow[]> {
  const rows = await db
    .select()
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.isActive, true)))
    .orderBy(desc(memory.updatedAt))
  return rows as unknown as MemoryRow[]
}

export async function getAllMemories(userId: string): Promise<MemoryRow[]> {
  const rows = await db
    .select()
    .from(memory)
    .where(eq(memory.userId, userId))
    .orderBy(desc(memory.updatedAt))
  return rows as unknown as MemoryRow[]
}

export async function getMemoryById(id: string): Promise<MemoryRow | null> {
  const [row] = await db.select().from(memory).where(eq(memory.id, id))
  return (row as unknown as MemoryRow) ?? null
}

export async function updateMemory(
  id: string,
  data: Partial<{
    type: MemoryType
    key: string
    value: Record<string, unknown>
    confidence: number
    source: MemorySource
    isActive: boolean
  }>
): Promise<MemoryRow | null> {
  const [row] = await db
    .update(memory)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(memory.id, id))
    .returning()
  return (row as unknown as MemoryRow) ?? null
}

export async function softDeleteMemory(id: string): Promise<void> {
  await db
    .update(memory)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(memory.id, id))
}

export async function hardDeleteMemory(id: string): Promise<void> {
  await db.delete(memory).where(eq(memory.id, id))
}

// ─── Session Summary ──────────────────────────────────────────────────────────

export async function upsertSessionSummary(data: {
  sessionId: string
  userId: string
  summary: string
}): Promise<void> {
  await db
    .insert(sessionSummary)
    .values({
      sessionId: data.sessionId,
      userId: data.userId,
      summary: data.summary
    })
    .onConflictDoUpdate({
      target: sessionSummary.sessionId,
      set: { summary: data.summary, updatedAt: new Date() }
    })
}

export async function getSessionSummary(sessionId: string) {
  const [row] = await db
    .select()
    .from(sessionSummary)
    .where(eq(sessionSummary.sessionId, sessionId))
  return row ?? null
}

// ─── Usage Log ────────────────────────────────────────────────────────────────

export async function logMemoryUsage(data: {
  memoryId: string
  sessionId: string
  reason: string
}): Promise<void> {
  await db.insert(memoryUsageLog).values(data)
}
