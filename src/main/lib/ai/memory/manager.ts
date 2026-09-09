import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import z from 'zod'

import {
  createMemory,
  getActiveMemories,
  getAllMemories,
  hardDeleteMemory,
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

/** Ops for the user-driven instruction path — adds `delete`, and every field
 *  except `op` is optional so a `delete` needn't carry a full entry. */
const InstructionSchema = z.object({
  operations: z.array(
    z.object({
      op: z.enum(['create', 'update', 'delete']),
      id: z.string().optional(),
      section: SectionEnum.optional(),
      key: z.string().optional(),
      summary: z.string().optional(),
      details: z.array(z.string()).optional(),
      confidence: z.number().min(0).max(1).optional()
    })
  )
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

const MEMORY_MODEL = `A memory entry is ONE topic / person / profile-area:
- section: "profile" (identity, environment/setup, hard constraints, enduring personal preferences like diet, tools, working style) | "topic" (a lasting interest or ongoing project) | "person" (someone in the user's life)
- key: a short, stable title — e.g. "Classical Music", "Homelab", "Investing"
- summary: a compact noun phrase naming what the entry covers — NOT a sentence. e.g. "Japanese equities trading, thesis, and analytical frameworks"
- details: 3–6 bullets, each ONE concrete, self-contained fact about the user — what they do, own, use, track, have analyzed, or have decided. Lead with the specifics: names, tickers, tools, frameworks, numbers, places. Drop hedges ("interested in", "finds useful", "wants", "prefers to see"). Merge and prune aggressively; never past ~6.`

const CONSOLIDATE_SYSTEM = `You maintain a durable, long-term memory of the user across conversations.

You are given the latest conversation and the current memory index. Decide what — if anything — to change. The default is to change NOTHING: most conversations teach nothing worth keeping.

${MEMORY_MODEL}

RECORD only information that is ALL of:
1. Durable — still true and relevant in months, not tied to one task or thread
2. About the user themselves — their identity, work, holdings, skills, relationships, sustained interests
3. Cross-conversation useful — changes how you'd help in a future, unrelated chat
4. Non-sensitive — no secrets, credentials, precise health data, exact balances/salary, private third-party info
5. Clearly stated or strongly implied by the user (not inferred by you from one exchange)

NEVER record:
- How the user wants you to respond — output format, verbosity, tone, diagram or table style, "wants comprehensive coverage", "likes mermaid diagrams". That is not memory.
- One-off task parameters — the scope of the current request or deliverable
- Transient state — today's question, a file just opened, what they're doing right now

Prefer UPDATE over CREATE. If the conversation adds to an existing entry, update it and return its FULL revised summary + details (not just the new part). Only CREATE when no existing entry fits and the subject is clearly a lasting one.

Respond ONLY with a JSON object:
{
  "operations": [
    { "op": "create", "section": "topic", "key": "Classical Music", "summary": "...", "details": ["...", "..."] },
    { "op": "update", "id": "<existing entry id>", "section": "topic", "key": "Classical Music", "summary": "...", "details": ["...", "..."] }
  ]
}

Return { "operations": [] } when nothing durable was learned — this is the common case. Never invent an id — only use ids from the index.`

const INSTRUCTION_SYSTEM = `You edit the user's long-term memory from a direct instruction. They are looking at their memory and telling you what to add, change, or remove.

${MEMORY_MODEL}

Do exactly what the user asked — nothing more. Prefer UPDATE of an existing entry over CREATE. Use DELETE only when they clearly want an entry gone. For create/update, return the entry's FULL summary + details.

Respond ONLY with a JSON object:
{
  "operations": [
    { "op": "create", "section": "person", "key": "Gerald", "summary": "The user's plant", "details": ["Named Gerald"] },
    { "op": "update", "id": "<id>", "section": "topic", "key": "...", "summary": "...", "details": ["..."] },
    { "op": "delete", "id": "<id>" }
  ]
}

Return { "operations": [] } if the instruction doesn't call for a memory change. Never invent an id.`

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

// ─── User instruction (manual edit) ───────────────────────────────────────────

function memoryEntryBlock(m: MemoryRow): string {
  const bullets = m.details.map((d) => `- ${d}`).join('\n')
  return `[${m.id}] (${m.section}) ${m.key}\nsummary: ${m.summary}${
    bullets ? `\n${bullets}` : ''
  }`
}

/**
 * Apply a free-text instruction from the user ("remember my plant is Gerald",
 * "drop the bullet about Helios", "delete this entry"). Unlike consolidation
 * this can DELETE, and runs synchronously so the route can report the result.
 * `scopeMemoryId` narrows the context to one entry the user is looking at.
 */
export async function runMemoryInstruction(
  instruction: string,
  scopeMemoryId: string | null,
  model: Model<string>,
  apiKey: string
): Promise<{ applied: number }> {
  // Include inactive entries so the user can reference / restore / delete them.
  const all = await getAllMemories(LOCAL_USER_ID)
  const scoped = scopeMemoryId
    ? (all.find((m) => m.id === scopeMemoryId) ?? null)
    : null

  const context = scoped
    ? `The user is editing this entry:\n${memoryEntryBlock(scoped)}\n\n` +
      `Other entries (id + title only):\n${
        all
          .filter((m) => m.id !== scoped.id)
          .map((m) => `- [${m.id}] (${m.section}) ${m.key}`)
          .join('\n') || '(none)'
      }`
    : `Current memory:\n${
        all.length > 0 ? all.map(memoryEntryBlock).join('\n\n') : '(empty)'
      }`

  const responseText = await callLlm(
    model,
    apiKey,
    INSTRUCTION_SYSTEM,
    `${context}\n\nUser instruction:\n${instruction.trim()}`
  )

  const parsed = InstructionSchema.safeParse(
    parseJsonFromResponse(responseText)
  )
  if (!parsed.success) {
    throw new Error("Couldn't interpret that instruction — try rephrasing.")
  }

  const validIds = new Set(all.map((m) => m.id))
  let applied = 0

  for (const op of parsed.data.operations) {
    if (op.op === 'delete') {
      if (op.id && validIds.has(op.id)) {
        await hardDeleteMemory(op.id)
        applied++
      }
      continue
    }

    if (!op.section || !op.key?.trim() || !op.summary?.trim()) continue
    const fields = {
      section: op.section as MemorySection,
      key: op.key.trim(),
      summary: op.summary.trim(),
      details: (op.details ?? [])
        .map((d) => d.trim())
        .filter(Boolean)
        .slice(0, 8)
    }

    if (op.op === 'update' && op.id && validIds.has(op.id)) {
      await updateMemory(op.id, { ...fields, confidence: op.confidence })
      applied++
    } else {
      await createMemory({
        userId: LOCAL_USER_ID,
        source: 'explicit',
        confidence: op.confidence ?? 0.9,
        ...fields
      })
      applied++
    }
  }

  return { applied }
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
