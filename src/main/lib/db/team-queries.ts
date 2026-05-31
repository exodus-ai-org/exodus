// src/main/lib/db/team-queries.ts
import { asc, eq } from 'drizzle-orm'

import { db } from './db'
import { team } from './schema'

export async function getAllTeams() {
  return db.select().from(team).orderBy(asc(team.createdAt))
}

export async function getTeamById(id: string) {
  const [row] = await db.select().from(team).where(eq(team.id, id))
  return row
}

export async function createTeam(data: typeof team.$inferInsert) {
  const [row] = await db.insert(team).values(data).returning()
  return row
}

export async function updateTeam(
  id: string,
  data: Partial<typeof team.$inferInsert>
) {
  const [row] = await db
    .update(team)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(team.id, id))
    .returning()
  return row
}

export async function deleteTeam(id: string) {
  // agent.teamId references team.id ON DELETE SET NULL — members are kept.
  return db.delete(team).where(eq(team.id, id))
}
