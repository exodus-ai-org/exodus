// src/main/lib/db/knowledge-queries.ts
import { desc, eq } from 'drizzle-orm'

import { db } from './db'
import { knowledgeDoc } from './schema'

export async function getAllKnowledgeDocs() {
  return db.select().from(knowledgeDoc).orderBy(desc(knowledgeDoc.updatedAt))
}

export async function createKnowledgeDoc(
  data: typeof knowledgeDoc.$inferInsert
) {
  const [row] = await db.insert(knowledgeDoc).values(data).returning()
  return row
}

export async function updateKnowledgeDoc(
  id: string,
  data: Partial<typeof knowledgeDoc.$inferInsert>
) {
  const [row] = await db
    .update(knowledgeDoc)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(knowledgeDoc.id, id))
    .returning()
  return row
}

export async function deleteKnowledgeDoc(id: string) {
  return db.delete(knowledgeDoc).where(eq(knowledgeDoc.id, id))
}

/**
 * STUB retrieval — naive case-insensitive substring match over title/content.
 * Signature & return shape mirror a future embedding search so callers won't
 * change when real RAG replaces this.
 */
export async function searchKnowledgeDocs(
  query: string
): Promise<Array<{ id: string; title: string; snippet: string }>> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const docs = await getAllKnowledgeDocs()
  return docs
    .filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    )
    .map((d) => ({
      id: d.id,
      title: d.title,
      snippet: d.content.slice(0, 280)
    }))
}
