import type { MemorySection, MemorySnapshot } from '@exodus/shared/types/memory'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { v4 as uuidV4 } from 'uuid'

import { db } from './db'
import { memory, memoryUsageLog } from './schema'

export type { MemorySection }
export type MemorySource = 'explicit' | 'implicit' | 'system'

export interface MemoryRow {
  id: string
  userId: string
  section: MemorySection
  key: string
  summary: string
  details: string[]
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
  section: MemorySection
  key: string
  summary: string
  details?: string[]
  confidence?: number
  source: MemorySource
}): Promise<MemoryRow> {
  const [row] = await db
    .insert(memory)
    .values({
      id: uuidV4(),
      userId: data.userId,
      section: data.section,
      key: data.key,
      summary: data.summary,
      details: data.details ?? [],
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
    section: MemorySection
    key: string
    summary: string
    details: string[]
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

/** Re-inserts a snapshot under its original id — what undo uses to reverse a
 *  `create` (the deleted row) or a `delete` (the snapshot it removed). */
export async function restoreMemory(
  id: string,
  userId: string,
  s: MemorySnapshot,
  source: MemorySource
): Promise<MemoryRow> {
  const [row] = await db
    .insert(memory)
    .values({
      id,
      userId,
      section: s.section,
      key: s.key,
      summary: s.summary,
      details: s.details,
      isActive: s.isActive,
      source
    })
    .returning()
  return row as unknown as MemoryRow
}

/** Bump `lastUsedAt` for memories that were surfaced into a chat. */
export async function touchMemories(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(memory)
    .set({ lastUsedAt: new Date() })
    .where(inArray(memory.id, ids))
}

// ─── Usage Log ────────────────────────────────────────────────────────────────

export async function logMemoryUsage(data: {
  memoryId: string
  sessionId: string
  reason: string
}): Promise<void> {
  await db.insert(memoryUsageLog).values(data)
}
