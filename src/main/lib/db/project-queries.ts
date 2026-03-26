import { desc, eq, sql } from 'drizzle-orm'

import { logger } from '../logger'
import { db } from './db'
import { chat, message, project, vote, type Project } from './schema'

export async function getAllProjects() {
  try {
    return await db.select().from(project).orderBy(desc(project.updatedAt))
  } catch (error) {
    logger.error('database', 'Failed to get projects')
    throw error
  }
}

export async function getProjectById({ id }: { id: string }) {
  try {
    const [result] = await db.select().from(project).where(eq(project.id, id))
    return result
  } catch (error) {
    logger.error('database', 'Failed to get project by id')
    throw error
  }
}

export async function getProjectWithCounts({ id }: { id: string }) {
  try {
    const [result] = await db.select().from(project).where(eq(project.id, id))

    if (!result) return null

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chat)
      .where(eq(chat.projectId, id))

    return {
      ...result,
      chatCount: countResult?.count ?? 0
    }
  } catch (error) {
    logger.error('database', 'Failed to get project with counts')
    throw error
  }
}

export async function createProject(
  data: Pick<Project, 'name'> &
    Partial<
      Pick<Project, 'description' | 'instructions' | 'structuredInstructions'>
    >
) {
  try {
    const [result] = await db.insert(project).values(data).returning()
    return result
  } catch (error) {
    logger.error('database', 'Failed to create project')
    throw error
  }
}

export async function updateProject({
  id,
  ...data
}: { id: string } & Partial<
  Pick<
    Project,
    'name' | 'description' | 'instructions' | 'structuredInstructions'
  >
>) {
  try {
    const [result] = await db
      .update(project)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning()
    return result
  } catch (error) {
    logger.error('database', 'Failed to update project')
    throw error
  }
}

export async function deleteProject({ id }: { id: string }) {
  try {
    return await db.transaction(async (tx) => {
      const projectChats = await tx
        .select({ id: chat.id })
        .from(chat)
        .where(eq(chat.projectId, id))

      for (const c of projectChats) {
        await tx.delete(vote).where(eq(vote.chatId, c.id))
        await tx.delete(message).where(eq(message.chatId, c.id))
      }

      if (projectChats.length > 0) {
        await tx.delete(chat).where(eq(chat.projectId, id))
      }

      return await tx.delete(project).where(eq(project.id, id))
    })
  } catch (error) {
    logger.error('database', 'Failed to delete project')
    throw error
  }
}

export async function getChatsByProjectId({
  projectId
}: {
  projectId: string
}) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.projectId, projectId))
      .orderBy(desc(chat.createdAt))
  } catch (error) {
    logger.error('database', 'Failed to get chats by project id')
    throw error
  }
}

export async function bumpProjectUpdatedAt({ id }: { id: string }) {
  try {
    return await db
      .update(project)
      .set({ updatedAt: new Date() })
      .where(eq(project.id, id))
  } catch (error) {
    logger.error('database', 'Failed to bump project updatedAt')
    throw error
  }
}
