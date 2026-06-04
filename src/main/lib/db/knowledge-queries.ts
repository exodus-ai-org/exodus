// src/main/lib/db/knowledge-queries.ts
import { desc, eq, isNull, or, inArray } from 'drizzle-orm'

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
 *
 * @param allowedTeamIds Scope of the search.
 *   - `null`  → no scope filter (global; used by UI lists)
 *   - array   → only docs whose `teamId` is in the array, plus General docs
 *               (`teamId IS NULL`). An empty array still admits General docs.
 */
export async function searchKnowledgeDocs(
  query: string,
  allowedTeamIds: string[] | null = null
): Promise<Array<{ id: string; title: string; snippet: string }>> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // Pull the scoped slice first so we never load unrelated team docs into memory.
  const rows = await (allowedTeamIds === null
    ? getAllKnowledgeDocs()
    : db
        .select()
        .from(knowledgeDoc)
        .where(
          allowedTeamIds.length === 0
            ? isNull(knowledgeDoc.teamId)
            : or(
                isNull(knowledgeDoc.teamId),
                inArray(knowledgeDoc.teamId, allowedTeamIds)
              )
        )
        .orderBy(desc(knowledgeDoc.updatedAt)))
  return rows
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
