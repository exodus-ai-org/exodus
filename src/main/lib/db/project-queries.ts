import { desc, eq } from 'drizzle-orm'

import { db } from './db'
import { project, type Project } from './schema'

export async function createProject(data: {
  name: string
  dir: string
  workDir: string
}): Promise<Project> {
  const [row] = await db.insert(project).values(data).returning()
  return row
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const [row] = await db.select().from(project).where(eq(project.id, id))
  return row
}

export async function getProjectByDir(
  dir: string
): Promise<Project | undefined> {
  const [row] = await db.select().from(project).where(eq(project.dir, dir))
  return row
}

export async function listRecentProjects(limit = 8): Promise<Project[]> {
  return db
    .select()
    .from(project)
    .orderBy(desc(project.lastUsedAt))
    .limit(limit)
}

export async function updateProject(
  id: string,
  data: Partial<typeof project.$inferInsert>
): Promise<Project> {
  const [row] = await db
    .update(project)
    .set(data)
    .where(eq(project.id, id))
    .returning()
  return row
}
