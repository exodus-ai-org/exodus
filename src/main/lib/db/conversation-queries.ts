// src/main/lib/db/conversation-queries.ts
import { asc, desc, eq } from 'drizzle-orm'

import { db } from './db'
import { conversation, conversationMessage, type Conversation } from './schema'

// ─── Conversation ─────────────────────────────────────────────────────────────

export async function getAllConversations() {
  return db
    .select()
    .from(conversation)
    .orderBy(desc(conversation.lastMessageAt))
}

export async function getConversationById(id: string) {
  const [row] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
  return row
}

export async function createConversation(
  data: typeof conversation.$inferInsert
) {
  const [row] = await db.insert(conversation).values(data).returning()
  return row
}

export async function updateConversation(
  id: string,
  data: Partial<typeof conversation.$inferInsert>
) {
  const [row] = await db
    .update(conversation)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversation.id, id))
    .returning()
  return row
}

export async function touchConversation(id: string) {
  const now = new Date()
  const [row] = await db
    .update(conversation)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversation.id, id))
    .returning()
  return row
}

export async function addMemberToConversation(
  conversationId: string,
  agentId: string
) {
  const current = await getConversationById(conversationId)
  const members = new Set<string>(
    (current?.memberAgentIds as string[] | null) ?? []
  )
  members.add(agentId)
  const [row] = await db
    .update(conversation)
    .set({ memberAgentIds: [...members], updatedAt: new Date() })
    .where(eq(conversation.id, conversationId))
    .returning()
  return row as Conversation & { memberAgentIds: string[] }
}

// ─── Conversation messages ────────────────────────────────────────────────────

export async function getMessagesByConversationId(conversationId: string) {
  return db
    .select()
    .from(conversationMessage)
    .where(eq(conversationMessage.conversationId, conversationId))
    .orderBy(asc(conversationMessage.createdAt))
}

export async function createConversationMessage(
  data: typeof conversationMessage.$inferInsert
) {
  const [row] = await db.insert(conversationMessage).values(data).returning()
  // Bump the parent conversation so it sorts to the top of the list.
  await touchConversation(data.conversationId)
  return row
}
