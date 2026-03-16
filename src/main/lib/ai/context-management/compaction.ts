import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import crypto from 'crypto'
import { getSummaryPromptForDepth } from './prompts'
import {
  getContextItems,
  getLatestLeafSummary,
  getMessageById,
  getSummariesByIds,
  insertSummary,
  linkSummaryToMessages,
  linkSummaryToParents,
  replaceContextRange
} from './queries'
import { estimateTokens } from './token-counter'

const LEAF_CHUNK_TOKENS = 20_000
const LEAF_TARGET_MIN = 800
const LEAF_TARGET_MAX = 1_200
const CONDENSED_TARGET_MIN = 1_500
const CONDENSED_TARGET_MAX = 2_000
const LEAF_MIN_FANOUT = 8
const CONDENSED_MIN_FANOUT = 4
const FALLBACK_TRUNCATE_TOKENS = 512
const FALLBACK_CHARS = FALLBACK_TRUNCATE_TOKENS * 3.5

function generateSummaryId(content: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(content + Date.now())
    .digest('hex')
  return `sum_${hash.slice(0, 16)}`
}

function extractText(content: unknown): string {
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: 'text'; text: string } => c?.type === 'text')
      .map((c) => c.text)
      .join('\n')
  }
  if (typeof content === 'string') return content
  return JSON.stringify(content)
}

async function callLlm(
  model: Model<string>,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  targetMin: number,
  targetMax: number,
  attempt: 1 | 2 | 3
): Promise<string> {
  if (attempt === 3) {
    // Deterministic fallback: truncate to FALLBACK_CHARS
    const truncated = userContent.slice(0, FALLBACK_CHARS)
    return (
      truncated + '\n[LCM fallback summary; truncated for context management]'
    )
  }

  const targetNote =
    attempt === 1
      ? `Target length: ${targetMin}–${targetMax} tokens.`
      : `Be aggressive. Target length: ${Math.min(640, Math.floor(targetMax * 0.2))} tokens max.`

  const result = await completeSimple(
    model,
    {
      systemPrompt: `${systemPrompt}\n\n${targetNote}`,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userContent }],
          timestamp: Date.now()
        }
      ]
    },
    { apiKey }
  )

  const text = result.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim()

  return text || ''
}

async function summarizeWithFallback(
  model: Model<string>,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  targetMin: number,
  targetMax: number
): Promise<string> {
  for (const attempt of [1, 2, 3] as const) {
    const text = await callLlm(
      model,
      apiKey,
      systemPrompt,
      userContent,
      targetMin,
      targetMax,
      attempt
    )
    if (text.length > 0) return text
  }
  // Should never reach here due to attempt=3 deterministic fallback
  return userContent.slice(0, FALLBACK_CHARS)
}

/**
 * Leaf pass: find oldest compactable messages, summarize them.
 * Returns true if any compaction was performed.
 */
export async function runLeafPass(
  chatId: string,
  model: Model<string>,
  apiKey: string,
  freshTailSize: number
): Promise<boolean> {
  const items = await getContextItems(chatId)
  if (items.length <= freshTailSize) return false

  // Eligible items: everything before the fresh tail, only 'message' kind
  const compactable = items.slice(0, -freshTailSize)
  const messageItems = compactable.filter((i) => i.kind === 'message')
  if (messageItems.length === 0) return false

  // Accumulate a chunk up to LEAF_CHUNK_TOKENS
  const chunkItems: typeof messageItems = []
  let chunkTokens = 0

  for (const item of messageItems) {
    const msg = await getMessageById(item.refId)
    if (!msg) continue
    const tokens = item.tokenCount ?? estimateTokens(extractText(msg.content))
    if (chunkTokens + tokens > LEAF_CHUNK_TOKENS && chunkItems.length > 0) break
    chunkItems.push(item)
    chunkTokens += tokens
  }

  if (chunkItems.length === 0) return false

  // Build conversation text
  const chunkMessages: Array<{ role: string; text: string; ts: Date }> = []
  for (const item of chunkItems) {
    const msg = await getMessageById(item.refId)
    if (msg) {
      chunkMessages.push({
        role: msg.role,
        text: extractText(msg.content),
        ts: msg.createdAt
      })
    }
  }

  const userContent = chunkMessages
    .map((m) => `[${m.role.toUpperCase()} @ ${m.ts.toISOString()}]\n${m.text}`)
    .join('\n\n---\n\n')

  // Get previous context for continuity
  const prevSummary = await getLatestLeafSummary(chatId)
  const previousContext = prevSummary?.content ?? ''

  const systemPrompt = getSummaryPromptForDepth(0, previousContext)
  const summaryText = await summarizeWithFallback(
    model,
    apiKey,
    systemPrompt,
    userContent,
    LEAF_TARGET_MIN,
    LEAF_TARGET_MAX
  )

  const summaryId = generateSummaryId(summaryText)
  const tokenCount = estimateTokens(summaryText)
  const earliestAt = chunkMessages[0].ts
  const latestAt = chunkMessages[chunkMessages.length - 1].ts

  await insertSummary({
    id: summaryId,
    chatId,
    kind: 'leaf',
    depth: 0,
    content: summaryText,
    tokenCount,
    descendantCount: chunkItems.length,
    earliestAt,
    latestAt
  })

  await linkSummaryToMessages(
    summaryId,
    chunkItems.map((i) => i.refId)
  )

  // Replace the compacted message range in context_items
  const fromOrdinal = chunkItems[0].ordinal
  const toOrdinal = chunkItems[chunkItems.length - 1].ordinal
  await replaceContextRange(
    chatId,
    fromOrdinal,
    toOrdinal,
    summaryId,
    tokenCount
  )

  return true
}

/**
 * Condensed pass: find eligible groups of same-depth summaries and condense them.
 * Returns true if any condensation was performed.
 */
export async function runCondensedPass(
  chatId: string,
  model: Model<string>,
  apiKey: string,
  freshTailSize: number
): Promise<boolean> {
  const items = await getContextItems(chatId)
  const compactable = items.slice(0, -freshTailSize)

  // Find contiguous groups of same-depth summaries
  let groupDepth = -1
  let groupIds: string[] = []
  let groupOrdinals: number[] = []
  let didCondense = false

  const flush = async () => {
    if (groupIds.length === 0) return
    const minFanout = groupDepth === 0 ? LEAF_MIN_FANOUT : CONDENSED_MIN_FANOUT
    if (groupIds.length < minFanout) return

    const parentSummaries = await getSummariesByIds(groupIds)
    if (parentSummaries.length === 0) return

    const userContent = parentSummaries
      .map(
        (s) =>
          `[${s.kind.toUpperCase()} depth=${s.depth} from=${s.earliestAt.toISOString()} to=${s.latestAt.toISOString()}]\n${s.content}`
      )
      .join('\n\n---\n\n')

    const targetDepth = groupDepth + 1
    const systemPrompt = getSummaryPromptForDepth(targetDepth)
    const summaryText = await summarizeWithFallback(
      model,
      apiKey,
      systemPrompt,
      userContent,
      CONDENSED_TARGET_MIN,
      CONDENSED_TARGET_MAX
    )

    const summaryId = generateSummaryId(summaryText)
    const tokenCount = estimateTokens(summaryText)
    const earliestAt = parentSummaries[0].earliestAt
    const latestAt = parentSummaries[parentSummaries.length - 1].latestAt
    const totalDescendants = parentSummaries.reduce(
      (n, s) => n + s.descendantCount,
      0
    )

    await insertSummary({
      id: summaryId,
      chatId,
      kind: 'condensed',
      depth: targetDepth,
      content: summaryText,
      tokenCount,
      descendantCount: totalDescendants,
      earliestAt,
      latestAt
    })

    await linkSummaryToParents(summaryId, groupIds)

    const fromOrdinal = groupOrdinals[0]
    const toOrdinal = groupOrdinals[groupOrdinals.length - 1]
    await replaceContextRange(
      chatId,
      fromOrdinal,
      toOrdinal,
      summaryId,
      tokenCount
    )

    didCondense = true
  }

  for (const item of compactable) {
    if (item.kind !== 'summary') {
      await flush()
      groupDepth = -1
      groupIds = []
      groupOrdinals = []
      continue
    }

    const [summary] = await getSummariesByIds([item.refId])
    if (!summary) continue

    if (summary.depth === groupDepth) {
      groupIds.push(summary.id)
      groupOrdinals.push(item.ordinal)
    } else {
      await flush()
      groupDepth = summary.depth
      groupIds = [summary.id]
      groupOrdinals = [item.ordinal]
    }
  }
  await flush()

  return didCondense
}

/**
 * Full compaction sweep: run leaf passes until no more eligible chunks,
 * then run condensed passes.
 */
export async function runFullCompaction(
  chatId: string,
  model: Model<string>,
  apiKey: string,
  freshTailSize: number,
  maxRounds = 10
): Promise<void> {
  for (let round = 0; round < maxRounds; round++) {
    const leafDone = await runLeafPass(chatId, model, apiKey, freshTailSize)
    if (!leafDone) break
  }
  for (let round = 0; round < maxRounds; round++) {
    const condenseDone = await runCondensedPass(
      chatId,
      model,
      apiKey,
      freshTailSize
    )
    if (!condenseDone) break
  }
}
