import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import z from 'zod'

import {
  createMemory,
  getActiveMemories,
  logMemoryUsage,
  touchMemories,
  updateMemory,
  type MemoryRow,
  type MemorySection
} from '../../db/memory-queries'
import { logger } from '../../logger'

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001'

// ─── Types ────────────────────────────────────────────────────────────────────

const SectionEnum = z.enum(['profile', 'topic', 'person'])

const ConsolidationSchema = z.object({
  operations: z.array(
    z.object({
      op: z.enum(['create', 'update']),
      id: z.string().optional(),
      section: SectionEnum,
      key: z.string().min(1),
      summary: z.string().min(1),
      details: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).optional()
    })
  )
})

const MemoryFilterResultSchema = z.object({
  selectedMemoryIds: z.array(z.string())
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessages(
  messages: Array<{ role: string; content: unknown }>
): string {
  return messages
    .map((m) => {
      const text = Array.isArray(m.content)
        ? m.content
            .filter(
              (c: unknown): c is { type: 'text'; text: string } =>
                typeof c === 'object' &&
                c !== null &&
                (c as { type: string }).type === 'text'
            )
            .map((c) => c.text)
            .join('')
        : String(m.content)
      return `${m.role.toUpperCase()}: ${text}`
    })
    .join('\n\n')
}

function parseJsonFromResponse(text: string): unknown {
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function callLlm(
  model: Model<string>,
  apiKey: string,
  systemPrompt: string,
  userText: string
): Promise<string> {
  const result = await completeSimple(
    model,
    {
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userText }],
          timestamp: Date.now()
        }
      ]
    },
    { apiKey }
  )
  return result.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim()
}

/** One line per entry for feeding an existing memory index to the LLM. */
function memoryIndexLine(m: MemoryRow): string {
  return `- [${m.id}] (${m.section}) ${m.key}: ${m.summary}`
}

// ─── Consolidation (write) ────────────────────────────────────────────────────

const CONSOLIDATE_SYSTEM = `You maintain a durable, long-term memory of the user across conversations.

You are given the latest conversation and the current memory index. Decide what — if anything — to change.

A memory entry is ONE topic / person / profile-area:
- section: "profile" (durable identity, environment/setup, hard constraints, stable preferences) | "topic" (an interest, project, or recurring subject) | "person" (someone in the user's life)
- key: a short, stable title — e.g. "Classical Music", "Homelab", "Investing"
- summary: a single sentence
- details: 3–6 bullet points. Keep the list tight: merge, rewrite, or drop stale bullets instead of letting it grow past ~6.

Only record information that is:
1. Long-term stable — still true in weeks or months
2. Cross-conversation useful — helps in future, unrelated chats
3. Not sensitive — no secrets, credentials, precise health/financial data, or private third-party info
4. Clearly stated or strongly implied

Prefer UPDATE over CREATE. If the conversation adds to an existing entry, update that entry and return its FULL revised summary + details (not just the new part). Only CREATE when no existing entry fits.

Respond ONLY with a JSON object:
{
  "operations": [
    { "op": "create", "section": "topic", "key": "Classical Music", "summary": "...", "details": ["...", "..."] },
    { "op": "update", "id": "<existing entry id>", "section": "topic", "key": "Classical Music", "summary": "...", "details": ["...", "..."] }
  ]
}

Return { "operations": [] } when nothing durable was learned. Never invent an id — only use ids from the index.`

export async function runMemoryConsolidation(
  messages: Array<{ role: string; content: unknown }>,
  model: Model<string>,
  apiKey: string
): Promise<void> {
  try {
    const existing = await getActiveMemories(LOCAL_USER_ID)
    const index =
      existing.length > 0 ? existing.map(memoryIndexLine).join('\n') : '(empty)'

    const responseText = await callLlm(
      model,
      apiKey,
      CONSOLIDATE_SYSTEM,
      `Current memory index:\n${index}\n\nConversation to analyze:\n\n${formatMessages(
        messages
      )}`
    )

    const parsed = ConsolidationSchema.safeParse(
      parseJsonFromResponse(responseText)
    )
    if (!parsed.success) return

    const validIds = new Set(existing.map((m) => m.id))

    for (const op of parsed.data.operations) {
      const fields = {
        section: op.section as MemorySection,
        key: op.key.trim(),
        summary: op.summary.trim(),
        details: op.details
          .map((d) => d.trim())
          .filter(Boolean)
          .slice(0, 8)
      }
      if (op.op === 'update' && op.id && validIds.has(op.id)) {
        await updateMemory(op.id, {
          ...fields,
          confidence: op.confidence
        })
      } else {
        await createMemory({
          userId: LOCAL_USER_ID,
          source: 'implicit',
          confidence: op.confidence ?? 0.8,
          ...fields
        })
      }
    }
  } catch (err) {
    logger.error('memory', 'Consolidation failed', { error: String(err) })
  }
}

// ─── Read filter ──────────────────────────────────────────────────────────────

const READ_FILTER_SYSTEM = `You select which memory entries are directly relevant to a user's message.
Be conservative: only pick entries that would NOTICEABLY improve the reply.
Respond ONLY with JSON: { "selectedMemoryIds": ["id1", "id2"] }
If nothing is relevant: { "selectedMemoryIds": [] }`

/**
 * Picks the memory entries worth injecting for this message, records the usage,
 * and returns the selected rows (already fetched — no extra query needed).
 */
export async function loadRelevantMemories(
  question: string,
  model: Model<string>,
  apiKey: string,
  sessionId: string
): Promise<MemoryRow[]> {
  try {
    const all = await getActiveMemories(LOCAL_USER_ID)
    if (all.length === 0) return []

    const listText = all
      .map(
        (m) =>
          `${m.id}: [${m.section}] ${m.key} — ${m.summary}` +
          (m.details.length ? `\n    ${m.details.join('; ')}` : '')
      )
      .join('\n')

    const responseText = await callLlm(
      model,
      apiKey,
      READ_FILTER_SYSTEM,
      `User message: ${question}\n\nMemory entries:\n${listText}`
    )

    const parsed = MemoryFilterResultSchema.safeParse(
      parseJsonFromResponse(responseText)
    )
    if (!parsed.success) return []

    const selectedIds = new Set(parsed.data.selectedMemoryIds)
    const selected = all.filter((m) => selectedIds.has(m.id))

    if (selected.length > 0) {
      const ids = selected.map((m) => m.id)
      await touchMemories(ids)
      await Promise.all(
        selected.map((m) =>
          logMemoryUsage({
            memoryId: m.id,
            sessionId,
            reason: 'read-filter'
          }).catch(() => {})
        )
      )
    }

    return selected
  } catch (err) {
    logger.error('memory', 'Read filter failed', { error: String(err) })
    return []
  }
}

export function formatMemoriesForSystem(memories: MemoryRow[]): string {
  if (memories.length === 0) return ''
  const blocks = memories.map((m) => {
    const bullets = m.details.map((d) => `- ${d}`).join('\n')
    return `## ${m.key} (${m.section})\n${m.summary}${bullets ? `\n${bullets}` : ''}`
  })
  return `\n\n<user_memory>\nThe user's saved memory:\n\n${blocks.join('\n\n')}\n</user_memory>`
}
