import { ErrorCode } from '@shared/constants/error-codes'
import { DatabaseError } from '@shared/errors/app-error'
import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { logger } from '../logger'

function logDbError(message: string, error: unknown) {
  logger.error('database', message, {
    error: String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
}
import { db, pglite } from './db'
import {
  chat,
  DBMessage,
  deepResearch,
  deepResearchMessage,
  message,
  settings,
  vote,
  type Chat,
  type DeepResearch,
  type DeepResearchMessage,
  type Message,
  type Settings
} from './schema'

export async function saveChat({
  title,
  id,
  projectId
}: {
  id: string
  title: string
  projectId?: string
}) {
  try {
    return await db.insert(chat).values({
      id,
      title,
      projectId
    })
  } catch (error) {
    logDbError('Failed to save chat', error)
    throw error
  }
}

export async function updateChat(payload: Omit<Chat, 'createdAt'>) {
  try {
    return await db.update(chat).set(payload).where(eq(chat.id, payload.id))
  } catch (error) {
    logDbError('Failed to update chat', error)
    throw error
  }
}

export async function getAllChats(projectId?: string) {
  try {
    if (projectId) {
      return await db
        .select()
        .from(chat)
        .where(eq(chat.projectId, projectId))
        .orderBy(desc(chat.createdAt))
    }
    return await db.select().from(chat).orderBy(desc(chat.createdAt))
  } catch (error) {
    logDbError('Failed to get chats', error)
    throw error
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id))
    await db.delete(message).where(eq(message.chatId, id))

    return await db.delete(chat).where(eq(chat.id, id))
  } catch (error) {
    logDbError('Failed to delete chat', error)
    throw error
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id))
    return selectedChat
  } catch (error) {
    logDbError('Failed to get chat by id', error)
    throw error
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages)
  } catch (error) {
    logDbError('Failed to save messages', error)
    throw error
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
  } catch (error) {
    logDbError('Failed to get messages by chat id', error)
    throw error
  }
}

export async function updateChatTitleById({
  id,
  title
}: {
  id: string
  title: string
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, id))
  } catch (error) {
    logDbError(`Failed to update title for chat ${id}`, error)
    throw error
  }
}

export async function updateMessage({
  id,
  content
}: {
  id: string
  content: DBMessage['content']
}) {
  try {
    return await db.update(message).set({ content }).where(eq(message.id, id))
  } catch {
    throw new DatabaseError(
      ErrorCode.DB_QUERY_FAILED,
      'Failed to update message'
    )
  }
}

export async function fullTextSearchOnMessages(query: string) {
  try {
    const messages = await db
      .select()
      .from(message)
      .where(
        sql`to_tsvector('simple', ${message.content}) @@ websearch_to_tsquery('simple', ${query})`
      )

    const searchResults = await Promise.all(
      messages.map(async (message) => {
        const chat = await getChatById({ id: message.chatId })
        return {
          ...message,
          title: chat.title
        }
      })
    )

    return searchResults
  } catch (error) {
    logDbError('Failed to complete full-text search', error)
    throw error
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type
}: {
  chatId: string
  messageId: string
  type: 'up' | 'down'
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)))

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up'
    })
  } catch (error) {
    logDbError('Failed to vote on message', error)
    throw error
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  return await db.select().from(vote).where(eq(vote.chatId, id))
}

export async function getSettings() {
  await db.insert(settings).values({ id: 'global' }).onConflictDoNothing()
  const [data] = await db.select().from(settings)
  return data!
}

export async function updateSettings(payload: Settings) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, ...rest } = payload
  return await db
    .update(settings)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(settings.id, payload.id))
}

export async function importData(tableName: string, blob: Blob) {
  await pglite.query(`COPY "${tableName}" FROM '/dev/blob';`, [], {
    blob
  })
}

export async function exportData(tableName: string) {
  const ret = await pglite.query(
    `COPY "${tableName}" TO '/dev/blob' DELIMITER ',' CSV HEADER;`
  )
  return ret.blob
}

export async function saveDeepResearch(payload: DeepResearch) {
  try {
    return await db.insert(deepResearch).values(payload)
  } catch (error) {
    logDbError('Failed to save deep research', error)
    throw error
  }
}

export async function getDeepResearchById({ id }: { id: string }) {
  try {
    const [selectedDeepSearch] = await db
      .select()
      .from(deepResearch)
      .where(eq(deepResearch.id, id))
    return selectedDeepSearch
  } catch (error) {
    logDbError('Failed to get deep research by id', error)
    throw error
  }
}

export async function updateDeepResearch(payload: DeepResearch) {
  try {
    return await db
      .update(deepResearch)
      .set(payload)
      .where(eq(deepResearch.id, payload.id))
  } catch (error) {
    logDbError('Failed to update deep research', error)
    throw error
  }
}

export async function saveDeepResearchMessage(payload: DeepResearchMessage) {
  try {
    return await db.insert(deepResearchMessage).values(payload)
  } catch (error) {
    logDbError('Failed to save deep research message', error)
    throw error
  }
}

export async function getDeepResearchMessagesById({ id }: { id: string }) {
  try {
    const deepResearchMessages = await db
      .select()
      .from(deepResearchMessage)
      .where(eq(deepResearchMessage.deepResearchId, id))
      .orderBy(asc(deepResearchMessage.createdAt))
    return deepResearchMessages
  } catch (error) {
    logDbError('Failed to get deep research messages', error)
    throw error
  }
}

/**
 * Aggregate token usage and costs from all assistant messages.
 * Returns per-row data so the caller can group however they want.
 */
export async function getUsageRows() {
  const rows = await db
    .select({
      model: message.model,
      provider: message.provider,
      usage: message.usage,
      createdAt: message.createdAt
    })
    .from(message)
    .where(
      and(eq(message.role, 'assistant'), sql`${message.usage} is not null`)
    )
    .orderBy(desc(message.createdAt))
  return rows
}
