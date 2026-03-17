import type { Message } from '@mariozechner/pi-ai'
import { asc, eq } from 'drizzle-orm'
import { getDb, getMessageTable } from '../init'
import type { LcmSummary } from '../schema'
import { formatSummaryAsXml } from './prompts'
import {
  getContextItems,
  getMessageById,
  getParentIds,
  getSummariesByIds,
  initContextItems
} from './queries'
import { estimateMessageTokens, estimateTokens } from './token-counter'

export interface AssembledContext {
  /** Messages to pass directly to agentLoop (summaries injected as system messages) */
  messages: Message[]
  /** Total token estimate of assembled context */
  totalTokens: number
  /** IDs of messages already tracked in lcm_context_items (for deduplication when appending) */
  trackedMessageIds: Set<string>
}

/**
 * Assembles the LLM context for a chat session.
 *
 * Flow:
 * 1. If no context items exist for this chat, bootstrap from message table
 * 2. Split items into: evictable prefix (summaries + old messages) + fresh tail (protected)
 * 3. Fill token budget: always include fresh tail, then backfill from evictable set
 * 4. Inject summaries as special user messages with XML markers
 */
export async function assembleContext(
  chatId: string,
  tokenBudget: number,
  freshTailSize: number
): Promise<AssembledContext> {
  // Bootstrap: if no context items tracked yet, seed from DB messages
  let items = await getContextItems(chatId)
  if (items.length === 0) {
    await bootstrapContextItems(chatId)
    items = await getContextItems(chatId)
  }

  const trackedMessageIds = new Set<string>(
    items.filter((i) => i.kind === 'message').map((i) => i.refId)
  )

  if (items.length === 0) {
    return { messages: [], totalTokens: 0, trackedMessageIds }
  }

  // Split: fresh tail = last N items; evictable = everything before
  const freshTail = items.slice(-freshTailSize)
  const evictable = items.slice(0, -freshTailSize)

  // Compute fresh tail token cost
  let freshTailTokens = 0
  const freshMessages: Message[] = []
  for (const item of freshTail) {
    if (item.kind === 'message') {
      const msg = await getMessageById(item.refId)
      if (msg) {
        const tokens = item.tokenCount ?? estimateMessageTokens(msg.content)
        freshTailTokens += tokens
        freshMessages.push(dbMessageToLlmMessage(msg))
      }
    } else {
      // Summary in fresh tail (uncommon but possible)
      const [summary] = await getSummariesByIds([item.refId])
      if (summary) {
        const tokens = item.tokenCount ?? estimateTokens(summary.content)
        freshTailTokens += tokens
        freshMessages.push(summaryToMessage(summary, []))
      }
    }
  }

  const remainingBudget = tokenBudget - freshTailTokens
  const prefixMessages: Message[] = []
  let prefixTokens = 0

  // Fill remaining budget from evictable set, newest first
  for (let i = evictable.length - 1; i >= 0; i--) {
    const item = evictable[i]
    if (item.kind === 'message') {
      const msg = await getMessageById(item.refId)
      if (!msg) continue
      const tokens = item.tokenCount ?? estimateMessageTokens(msg.content)
      if (prefixTokens + tokens > remainingBudget) break
      prefixTokens += tokens
      prefixMessages.unshift(dbMessageToLlmMessage(msg))
    } else {
      const [summary] = await getSummariesByIds([item.refId])
      if (!summary) continue
      const tokens = item.tokenCount ?? estimateTokens(summary.content)
      if (prefixTokens + tokens > remainingBudget) break
      prefixTokens += tokens
      const parentIds = await getParentIds(summary.id)
      prefixMessages.unshift(summaryToMessage(summary, parentIds))
    }
  }

  return {
    messages: [...prefixMessages, ...freshMessages],
    totalTokens: prefixTokens + freshTailTokens,
    trackedMessageIds
  }
}

/** Convert a DB message row to a pi-ai Message (handling all roles) */
function dbMessageToLlmMessage(msg: {
  id: string
  role: string
  content: unknown
  toolCallId: string | null
  toolName: string | null
  isError: boolean | null
  createdAt: Date
}): Message {
  if (msg.role === 'toolResult') {
    return {
      role: 'toolResult',
      content: msg.content as Message['content'],
      toolCallId: msg.toolCallId ?? '',
      toolName: msg.toolName ?? '',
      isError: msg.isError ?? false,
      timestamp: msg.createdAt.getTime()
    } as Message
  }
  return {
    role: msg.role as 'user' | 'assistant',
    content: msg.content as Message['content'],
    timestamp: msg.createdAt.getTime()
  } as Message
}

/** Seed lcm_context_items from existing messages in the DB for a chat */
async function bootstrapContextItems(chatId: string): Promise<void> {
  const db = getDb()
  const messageTable = getMessageTable()

  const messages = await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(asc(messageTable.createdAt))

  if (messages.length === 0) return

  await initContextItems(
    chatId,
    messages.map((m: { id: string; content: unknown }) => ({
      kind: 'message' as const,
      refId: m.id,
      tokenCount: estimateMessageTokens(m.content)
    }))
  )
}

/** Convert a summary to a pi-ai compatible Message with XML wrapper */
function summaryToMessage(summary: LcmSummary, parentIds: string[]): Message {
  const xml = formatSummaryAsXml({
    id: summary.id,
    kind: summary.kind as 'leaf' | 'condensed',
    depth: summary.depth,
    content: summary.content,
    descendantCount: summary.descendantCount,
    earliestAt: summary.earliestAt,
    latestAt: summary.latestAt,
    parentIds
  })

  return {
    role: 'user',
    content: [{ type: 'text', text: xml }],
    timestamp: summary.createdAt.getTime()
  }
}
