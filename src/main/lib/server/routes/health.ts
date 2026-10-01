// src/main/lib/server/routes/health.ts
// exodus-ios's Health workspace: one report a day, written from the phone's
// aggregated snapshot. Stateless — nothing is stored, and the logs carry
// timings, never the numbers.
import { ErrorCode } from '@exodus/shared/constants/error-codes'
import { AIError } from '@exodus/shared/errors/app-error'
import {
  healthSnapshotSchema,
  parseHealthSummary,
  type HealthSnapshot
} from '@exodus/shared/types/health'
import { Hono } from 'hono'

import {
  callLlm,
  loadRelevantMemories,
  parseJsonFromResponse
} from '../../ai/memory/manager'
import { getModelFromProvider } from '../../ai/utils/model-util'
import type { MemoryRow } from '../../db/memory-queries'
import { logger } from '../../logger'
import { Variables } from '../types'
import { validateSchema } from '../utils'

export const HEALTH_SUMMARY_SYSTEM = `You write a short, warm daily health note for one person from the numbers you are given.
Rules:
- Write in the language named by "locale" (a BCP-47 tag).
- Use only the numbers in the snapshot and quote them exactly. A category that is null has no data: say nothing about it and set its line to null.
- Never diagnose, never name a condition, never give medical advice beyond everyday habits (sleep, walking, water, rest).
- "headline": at most 60 characters, no trailing punctuation.
- "summary": 2 to 4 sentences of Markdown; bold (**...**) the one or two numbers that matter most.
- "categories": one short sentence per category, or null.
- "memorySuggestion": only when the snapshot and the known memories show a lasting pattern worth remembering long-term — never a one-day event, never something the memories already say. Shape: {"section":"profile","key":"kebab-case-key","summary":"one sentence"}. Otherwise null.
Respond ONLY with JSON: {"headline":"...","summary":"...","categories":{"sleep":...,"activity":...,"recovery":...,"body":...},"memorySuggestion":...}`

/** What the memory read-filter is asked about: the day in one line. */
export function memoryQuestion(s: HealthSnapshot): string {
  const parts: string[] = []
  if (s.sleep) parts.push(`sleep ${s.sleep.asleepMin} min`)
  if (s.activity) parts.push(`steps ${s.activity.steps}/${s.activity.stepGoal}`)
  if (s.recovery?.level) parts.push(`recovery ${s.recovery.level}`)
  if (s.body) parts.push(`water ${s.body.waterCups} cups`)
  return `Daily health report. ${parts.join('; ')}`
}

function userText(s: HealthSnapshot, memories: MemoryRow[]): string {
  const known = memories.length
    ? memories.map((m) => `- [${m.section}] ${m.key} — ${m.summary}`).join('\n')
    : '(none)'
  return `Snapshot:\n${JSON.stringify(s)}\n\nKnown memories:\n${known}`
}

const health = new Hono<{ Variables: Variables }>()

health.post('/summary', async (c) => {
  const snapshot = validateSchema(
    healthSnapshotSchema,
    await c.req.json(),
    'Invalid health snapshot'
  )
  const setting = c.get('settings')
  const { model, apiKey } = getModelFromProvider(setting)
  const started = Date.now()
  const session = `health:${snapshot.date}`
  const memories =
    setting.memory?.useInChat !== false
      ? await loadRelevantMemories(
          memoryQuestion(snapshot),
          model,
          apiKey,
          session,
          session
        )
      : []
  const prompt = userText(snapshot, memories)

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callLlm(model, apiKey, HEALTH_SUMMARY_SYSTEM, prompt)
    const parsed = parseHealthSummary(parseJsonFromResponse(text))
    if (parsed) {
      logger.info('health', 'Summary written', {
        ms: Date.now() - started,
        attempt
      })
      return c.json(parsed)
    }
  }
  logger.warn('health', 'Summary output invalid twice', {
    ms: Date.now() - started
  })
  throw new AIError(
    ErrorCode.AI_GENERATION_FAILED,
    'The health summary could not be written.'
  )
})

export default health
