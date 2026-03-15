import type {
  Api,
  AssistantMessage,
  Provider,
  StopReason,
  ToolResultMessage,
  Usage,
  UserMessage
} from '@mariozechner/pi-ai'
import { and, asc, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm'
import { v4 as uuidV4 } from 'uuid'
import type { ChatMessage } from '../../../shared/types/chat'
import {
  EmbeddingConfig,
  generateEmbedding,
  generateEmbeddings
} from '../ai/rag'
import { ChatSDKError } from '../server/errors'
import { db, pglite } from './db'
import {
  chat,
  DBMessage,
  deepResearch,
  deepResearchMessage,
  embedding,
  message,
  resource,
  setting,
  vote,
  type Chat,
  type DeepResearch,
  type DeepResearchMessage,
  type Message,
  type Setting
} from './schema'

export async function saveChat({ title, id }: { id: string; title: string }) {
  try {
    return await db.insert(chat).values({
      id,
      title
    })
  } catch (error) {
    console.error('Failed to save chat in database')
    throw error
  }
}

export async function updateChat(payload: Omit<Chat, 'createdAt'>) {
  try {
    return await db.update(chat).set(payload).where(eq(chat.id, payload.id))
  } catch (error) {
    console.error('Failed to save chat in database')
    throw error
  }
}

export async function getAllChats() {
  try {
    return await db.select().from(chat).orderBy(desc(chat.createdAt))
  } catch (error) {
    console.error('Failed to get chats by user from database')
    throw error
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id))
    await db.delete(message).where(eq(message.chatId, id))

    return await db.delete(chat).where(eq(chat.id, id))
  } catch (error) {
    console.error('Failed to delete chat by id from database')
    throw error
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id))
    return selectedChat
  } catch (error) {
    console.error('Failed to get chat by id from database')
    throw error
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages)
  } catch (error) {
    console.error('Failed to save messages in database')
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
    console.error('Failed to get messages by chat id from database', error)
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
    console.warn('Failed to update title for chat', id, error)
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
    throw new ChatSDKError('bad_request:database', 'Failed to update message')
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
    console.error('Failed to complete full-text search from database', error)
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
    console.error('Failed to upvote message in database', error)
    throw error
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  return await db.select().from(vote).where(eq(vote.chatId, id))
}

export async function getSetting() {
  await db.insert(setting).values({ id: 'global' }).onConflictDoNothing()
  const [data] = await db.select().from(setting)
  return data!
}

export async function updateSetting(payload: Setting) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, ...rest } = payload
  return await db
    .update(setting)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(setting.id, payload.id))
}

export const findRelevantContent = async (
  { userQuery }: { userQuery: string },
  config: EmbeddingConfig
) => {
  const userQueryEmbedded = await generateEmbedding(
    { value: userQuery },
    config
  )
  const similarity = sql<number>`1 - (${cosineDistance(
    embedding.embedding,
    userQueryEmbedded
  )})`
  const similarGuides = await db
    .select({ name: embedding.content, similarity })
    .from(embedding)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4)

  return similarGuides
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
    console.error('Failed to save deep research in database')
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
    console.error('Failed to get deep search by id from database')
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
    console.error('Failed to update deep research result in database')
    throw error
  }
}

export async function saveDeepResearchMessage(payload: DeepResearchMessage) {
  try {
    return await db.insert(deepResearchMessage).values(payload)
  } catch (error) {
    console.error('Failed to save deep research message in database')
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
    console.error('Failed to get deep research message by id from database')
    throw error
  }
}

function toPgVector(arr: number[]) {
  return `[${arr.join(',')}]`
}

export const createResource = async (
  { content, chunks }: { content: string; chunks: string[] },
  config: EmbeddingConfig
) => {
  try {
    const [currResource] = await db
      .insert(resource)
      .values({ content })
      .returning()

    const embeddings = await generateEmbeddings({ chunks }, config)
    await db.insert(embedding).values(
      embeddings.map(({ embedding, content }) => ({
        id: uuidV4(),
        resourceId: currResource.id,
        content,
        embedding: sql`${toPgVector(embedding)}::vector`
      }))
    )
    return 'Resource successfully created and embedded.'
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.'
  }
}

export async function getResourcePaginated(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize

  const data = await db
    .select()
    .from(resource)
    .orderBy(desc(resource.createdAt))
    .limit(pageSize)
    .offset(offset)

  const [{ count: total }] = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(resource)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total
    }
  }
}

export function dbMessageToChatMessage(dbMsg: DBMessage): ChatMessage {
  if (dbMsg.role === 'user') {
    return {
      id: dbMsg.id,
      role: 'user',
      content: dbMsg.content as UserMessage['content'],
      timestamp: dbMsg.createdAt.getTime()
    }
  }
  if (dbMsg.role === 'assistant') {
    return {
      id: dbMsg.id,
      role: 'assistant',
      content: dbMsg.content as AssistantMessage['content'],
      usage: dbMsg.usage as Usage,
      api: (dbMsg.api ?? '') as Api,
      provider: (dbMsg.provider ?? '') as Provider,
      model: dbMsg.model ?? '',
      stopReason: (dbMsg.stopReason ?? 'stop') as StopReason,
      timestamp: dbMsg.createdAt.getTime()
    }
  }
  // toolResult
  return {
    id: dbMsg.id,
    role: 'toolResult',
    toolCallId: dbMsg.toolCallId ?? '',
    toolName: dbMsg.toolName ?? '',
    content: dbMsg.content as ToolResultMessage['content'],
    isError: dbMsg.isError ?? false,
    timestamp: dbMsg.createdAt.getTime()
  }
}
