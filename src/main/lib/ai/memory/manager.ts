import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import z from 'zod'
import {
  createMemory,
  getActiveMemories,
  upsertSessionSummary
} from '../../db/memory-queries'

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType =
  | 'preference'
  | 'goal'
  | 'environment'
  | 'skill'
  | 'project'
  | 'constraint'

const MemoryWriteResultSchema = z.object({
  shouldWrite: z.boolean(),
  type: z
    .enum([
      'preference',
      'goal',
      'environment',
      'skill',
      'project',
      'constraint'
    ])
    .optional(),
  key: z.string().optional(),
  value: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['explicit', 'implicit']).optional()
})

const MemoryFilterResultSchema = z.object({
  selectedMemoryIds: z.array(z.string())
})

const SessionSummaryResultSchema = z.object({
  userGoal: z.string().optional(),
  confirmedFacts: z.array(z.string()),
  openQuestions: z.array(z.string()),
  importantPreferences: z.array(z.string())
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
  // Extract JSON from markdown code blocks or raw
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

// ─── Memory Write Judge ────────────────────────────────────────────────────────

const WRITE_JUDGE_SYSTEM = `You analyze a conversation and decide whether any information should be saved as a long-term memory.

Only save if ALL criteria are met:
1. Long-term stable: will still be true in weeks or months
2. Cross-conversation value: useful in future unrelated conversations
3. Not sensitive: no passwords, tokens, or private data
4. Clearly stated: explicitly mentioned or strongly implied

Memory types: preference, goal, environment, skill, project, constraint

Respond ONLY with a JSON object:
{
  "shouldWrite": boolean,
  "type": "preference" | "goal" | "environment" | "skill" | "project" | "constraint",
  "key": "short descriptive key",
  "value": { "text": "the memory content" },
  "confidence": 0.0-1.0,
  "source": "explicit" | "implicit"
}

If shouldWrite is false, only include that field.`

export async function runMemoryWriteJudge(
  messages: Array<{ role: string; content: unknown }>,
  model: Model<string>,
  apiKey: string
): Promise<void> {
  try {
    const conversationText = formatMessages(messages)
    const responseText = await callLlm(
      model,
      apiKey,
      WRITE_JUDGE_SYSTEM,
      `Conversation to analyze:\n\n${conversationText}`
    )

    const parsed = parseJsonFromResponse(responseText)
    const result = MemoryWriteResultSchema.safeParse(parsed)
    if (!result.success || !result.data.shouldWrite) return

    const { type, key, value, confidence, source } = result.data
    if (!type || !key || !value) return

    await createMemory({
      userId: LOCAL_USER_ID,
      type,
      key,
      value,
      confidence: confidence ?? 0.8,
      source: source ?? 'implicit'
    })
  } catch (err) {
    console.error('[Memory] Write judge failed:', err)
  }
}

// ─── Memory Read Filter ────────────────────────────────────────────────────────

const READ_FILTER_SYSTEM = `You select which memories are directly relevant to a user's question.
Be conservative: only select memories that would NOTICEABLY improve the response.
Respond ONLY with a JSON object: { "selectedMemoryIds": ["id1", "id2"] }
If nothing is relevant, return: { "selectedMemoryIds": [] }`

export async function loadRelevantMemories(
  question: string,
  model: Model<string>,
  apiKey: string
): Promise<Array<{ id: string; type: string; key: string; value: unknown }>> {
  try {
    const allMemories = await getActiveMemories(LOCAL_USER_ID)
    if (allMemories.length === 0) return []

    const memorySummaries = allMemories.map((m) => ({
      id: m.id,
      type: m.type,
      content: `[${m.type}] ${m.key}: ${JSON.stringify(m.value)}`
    }))

    const memoriesText = memorySummaries
      .map((m) => `${m.id}: ${m.content}`)
      .join('\n')
    const responseText = await callLlm(
      model,
      apiKey,
      READ_FILTER_SYSTEM,
      `User question: ${question}\n\nAvailable memories:\n${memoriesText}`
    )

    const parsed = parseJsonFromResponse(responseText)
    const result = MemoryFilterResultSchema.safeParse(parsed)
    if (!result.success) return []

    const selectedIds = new Set(result.data.selectedMemoryIds)
    return allMemories
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({ id: m.id, type: m.type, key: m.key, value: m.value }))
  } catch (err) {
    console.error('[Memory] Read filter failed:', err)
    return []
  }
}

export function formatMemoriesForSystem(
  memories: Array<{ type: string; key: string; value: unknown }>
): string {
  if (memories.length === 0) return ''
  const lines = memories.map(
    (m) =>
      `- [${m.type}] ${m.key}: ${typeof m.value === 'object' ? JSON.stringify(m.value) : m.value}`
  )
  return `\n\n<user_memory>\nRelevant facts about the user:\n${lines.join('\n')}\n</user_memory>`
}

// ─── Session Summary ───────────────────────────────────────────────────────────

const SESSION_SUMMARY_SYSTEM = `Summarize the key outcomes of this conversation.
Respond ONLY with a JSON object:
{
  "userGoal": "the main thing the user was trying to achieve (optional)",
  "confirmedFacts": ["fact 1", "fact 2"],
  "openQuestions": ["unresolved question 1"],
  "importantPreferences": ["preference stated by user"]
}`

export async function saveSessionSummary(
  chatId: string,
  messages: Array<{ role: string; content: unknown }>,
  model: Model<string>,
  apiKey: string
): Promise<void> {
  try {
    const conversationText = formatMessages(messages)
    const responseText = await callLlm(
      model,
      apiKey,
      SESSION_SUMMARY_SYSTEM,
      `Conversation:\n\n${conversationText}`
    )

    const parsed = parseJsonFromResponse(responseText)
    const result = SessionSummaryResultSchema.safeParse(parsed)
    if (!result.success) return

    const { userGoal, confirmedFacts, openQuestions, importantPreferences } =
      result.data
    const summaryText = [
      userGoal ? `Goal: ${userGoal}` : '',
      confirmedFacts.length
        ? `Facts:\n${confirmedFacts.map((f) => `- ${f}`).join('\n')}`
        : '',
      openQuestions.length
        ? `Open:\n${openQuestions.map((q) => `- ${q}`).join('\n')}`
        : '',
      importantPreferences.length
        ? `Preferences:\n${importantPreferences.map((p) => `- ${p}`).join('\n')}`
        : ''
    ]
      .filter(Boolean)
      .join('\n\n')

    if (summaryText) {
      await upsertSessionSummary({
        sessionId: chatId,
        userId: LOCAL_USER_ID,
        summary: summaryText
      })
    }
  } catch (err) {
    console.error('[Memory] Session summary failed:', err)
  }
}
