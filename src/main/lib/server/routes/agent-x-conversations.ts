// src/main/lib/server/routes/agent-x-conversations.ts
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'

import { askUserRegistry } from '../../ai/agent-x/ask-user-registry'
import { runPmCoordinator } from '../../ai/agent-x/pm-coordinator'
import { getAgentXCostRows } from '../../db/agent-x-queries'
import {
  createConversation,
  createConversationMessage,
  deleteConversation,
  getAllConversations,
  getLatestMessagePerConversation,
  getMessagesByConversationId,
  updateConversation
} from '../../db/conversation-queries'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getAllKnowledgeDocs,
  updateKnowledgeDoc
} from '../../db/knowledge-queries'
import { logger } from '../../logger'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'
import { emitToConversation } from './agent-x-sse'

interface CostRow {
  conversationId: string | null
  agentId: string
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    cost?: number
  } | null
  startedAt: Date
}

export interface AgentXCostSummary {
  totalCost: number
  totalTokens: number
  byConversation: Array<{
    conversationId: string
    cost: number
    tokens: number
  }>
  byAgent: Array<{ agentId: string; cost: number; tokens: number }>
  daily: Array<{ date: string; cost: number; tokens: number }>
}

/** Pure aggregation — unit tested. Costs come ONLY from agent-x executions. */
export function aggregateCosts(rows: CostRow[]): AgentXCostSummary {
  let totalCost = 0
  let totalTokens = 0
  const conv = new Map<string, { cost: number; tokens: number }>()
  const agent = new Map<string, { cost: number; tokens: number }>()
  const day = new Map<string, { cost: number; tokens: number }>()

  for (const r of rows) {
    const u = r.tokenUsage
    if (!u) continue
    const tokens = (u.inputTokens ?? 0) + (u.outputTokens ?? 0)
    const cost = u.cost ?? 0
    totalCost += cost
    totalTokens += tokens
    if (r.conversationId) {
      const c = conv.get(r.conversationId) ?? { cost: 0, tokens: 0 }
      c.cost += cost
      c.tokens += tokens
      conv.set(r.conversationId, c)
    }
    const a = agent.get(r.agentId) ?? { cost: 0, tokens: 0 }
    a.cost += cost
    a.tokens += tokens
    agent.set(r.agentId, a)
    const d = r.startedAt.toISOString().slice(0, 10)
    const dd = day.get(d) ?? { cost: 0, tokens: 0 }
    dd.cost += cost
    dd.tokens += tokens
    day.set(d, dd)
  }

  return {
    totalCost,
    totalTokens,
    byConversation: [...conv.entries()].map(([conversationId, v]) => ({
      conversationId,
      ...v
    })),
    byAgent: [...agent.entries()].map(([agentId, v]) => ({ agentId, ...v })),
    daily: [...day.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))
  }
}

const router = new Hono<{ Variables: Variables }>()

// ─── Conversations ──────────────────────────────────────────────────────────

router.get('/conversations', async (c) => {
  const [conversations, latest] = await Promise.all([
    handleDatabaseOperation(
      () => getAllConversations(),
      'Failed to list conversations'
    ),
    handleDatabaseOperation(
      () => getLatestMessagePerConversation(),
      'Failed to list conversations'
    )
  ])
  const latestByConv = new Map(latest.map((m) => [m.conversationId, m]))
  return successResponse(
    c,
    conversations.map((row) => ({
      ...row,
      latestMessage: latestByConv.get(row.id) ?? null
    }))
  )
})

router.post('/conversations', async (c) => {
  const data = validateSchema(
    z.object({ title: z.string().min(1), icon: z.string().optional() }),
    await c.req.json(),
    'Invalid conversation data'
  )
  const row = await handleDatabaseOperation(
    () => createConversation(data),
    'Failed to create conversation'
  )
  return successResponse(c, row, 201)
})

router.delete('/conversations/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  await handleDatabaseOperation(
    () => deleteConversation(id),
    'Failed to delete conversation'
  )
  return c.text('Conversation deleted', 200)
})

router.put('/conversations/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    z.object({
      title: z.string().optional(),
      icon: z.string().optional(),
      archived: z.boolean().optional()
    }),
    await c.req.json(),
    'Invalid conversation data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => updateConversation(id, data),
      'Failed to update'
    )
  )
})

router.get('/conversations/:id/messages', async (c) => {
  const id = getRequiredParam(c, 'id')
  return successResponse(c, await getMessagesByConversationId(id))
})

// Send a user message → persist → kick the PM loop (fire-and-forget).
router.post('/conversations/:id/messages', async (c) => {
  const id = getRequiredParam(c, 'id')
  const { content } = validateSchema(
    z.object({ content: z.string().min(1) }),
    await c.req.json(),
    'Invalid message'
  )
  const userMsg = await createConversationMessage({
    conversationId: id,
    role: 'user',
    content
  })
  emitToConversation(id, {
    type: 'message_start',
    conversationId: id,
    messageId: userMsg.id,
    role: 'user'
  })
  emitToConversation(id, {
    type: 'message_end',
    conversationId: id,
    messageId: userMsg.id
  })

  runPmCoordinator({
    conversationId: id,
    userText: content,
    excludeMessageId: userMsg.id,
    emit: (event) => emitToConversation(id, event)
  }).catch((err) =>
    logger.error('agent_x', 'PM loop error', { error: String(err) })
  )

  return successResponse(c, userMsg, 201)
})

// Resolve a pending askUser.
router.post('/conversations/:id/respond', async (c) => {
  const id = getRequiredParam(c, 'id')
  const { response } = validateSchema(
    z.object({ response: z.string() }),
    await c.req.json(),
    'Invalid response'
  )
  await createConversationMessage({
    conversationId: id,
    role: 'user',
    content: response
  })
  askUserRegistry.resolve(id, response)
  return successResponse(c, { success: true })
})

// ─── Knowledge base ──────────────────────────────────────────────────────────

router.get('/knowledge', async (c) =>
  successResponse(c, await getAllKnowledgeDocs())
)
router.post('/knowledge', async (c) => {
  const data = validateSchema(
    z.object({ title: z.string().min(1), content: z.string().min(1) }),
    await c.req.json(),
    'Invalid knowledge doc'
  )
  return successResponse(c, await createKnowledgeDoc(data), 201)
})
router.put('/knowledge/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    z.object({ title: z.string().optional(), content: z.string().optional() }),
    await c.req.json(),
    'Invalid knowledge doc'
  )
  return successResponse(c, await updateKnowledgeDoc(id, data))
})
router.delete('/knowledge/:id', async (c) => {
  await deleteKnowledgeDoc(getRequiredParam(c, 'id'))
  return c.text('deleted', 200)
})

// ─── Costs (agent-x only) ──────────────────────────────────────────────────────

router.get('/costs', async (c) => {
  const rows = await getAgentXCostRows()
  return successResponse(c, aggregateCosts(rows as never))
})

export default router
