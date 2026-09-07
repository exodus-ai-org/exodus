// src/main/lib/db/knowledge-queries.ts
import { and, desc, eq, isNotNull } from 'drizzle-orm'

import { db } from './db'
import { knowledgeDoc, type KnowledgeDoc } from './schema'

export async function getAllKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  return db.select().from(knowledgeDoc).orderBy(desc(knowledgeDoc.updatedAt))
}

export async function getKnowledgeDocById(
  id: string
): Promise<KnowledgeDoc | undefined> {
  const [row] = await db
    .select()
    .from(knowledgeDoc)
    .where(eq(knowledgeDoc.id, id))
  return row
}

export async function createKnowledgeDoc(data: {
  title: string
  content: string
}): Promise<KnowledgeDoc> {
  const [row] = await db.insert(knowledgeDoc).values(data).returning()
  return row
}

export async function updateKnowledgeDoc(
  id: string,
  data: Partial<{ title: string; content: string }>
): Promise<KnowledgeDoc> {
  const [row] = await db
    .update(knowledgeDoc)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(knowledgeDoc.id, id))
    .returning()
  return row
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  await db.delete(knowledgeDoc).where(eq(knowledgeDoc.id, id))
}

type IndexStatusPatch = Partial<
  Pick<
    KnowledgeDoc,
    | 'indexStatus'
    | 'indexError'
    | 'lightragDocId'
    | 'lightragTrackId'
    | 'syncedHash'
  >
>

export async function setIndexStatus(
  id: string,
  patch: IndexStatusPatch
): Promise<void> {
  await db.update(knowledgeDoc).set(patch).where(eq(knowledgeDoc.id, id))
}

export async function getProcessingDocs(): Promise<KnowledgeDoc[]> {
  return db
    .select()
    .from(knowledgeDoc)
    .where(
      and(
        eq(knowledgeDoc.indexStatus, 'processing'),
        isNotNull(knowledgeDoc.lightragTrackId)
      )
    )
    .orderBy(desc(knowledgeDoc.updatedAt))
}
