import { asc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { mcpServer } from './schema'

export async function getAllMcpServers() {
  return db.select().from(mcpServer).orderBy(asc(mcpServer.createdAt))
}

export async function getMcpServerById(id: string) {
  const [result] = await db.select().from(mcpServer).where(eq(mcpServer.id, id))
  return result
}

export async function getMcpServersByNames(names: string[]) {
  return db.select().from(mcpServer).where(inArray(mcpServer.name, names))
}

export async function createMcpServer(data: typeof mcpServer.$inferInsert) {
  const [result] = await db.insert(mcpServer).values(data).returning()
  return result
}

export async function updateMcpServer(
  id: string,
  data: Partial<typeof mcpServer.$inferInsert>
) {
  const [result] = await db
    .update(mcpServer)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mcpServer.id, id))
    .returning()
  return result
}

export async function deleteMcpServer(id: string) {
  return db.delete(mcpServer).where(eq(mcpServer.id, id))
}
