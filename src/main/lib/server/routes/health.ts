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

export const HEALTH_SUMMARY_SYSTEM = `You write a short, warm daily health note for one person from the numbers you are given. The phone shows it as a headline, a few one-sentence insights, and one small idea; it colours the phrases you mark.
Rules:
- Write in the language named by "locale" (a BCP-47 tag).
- Use only the numbers in the snapshot and quote them exactly. A category that is null has no data: say nothing about it and set its line to null.
- Never diagnose, never name a condition, never give medical advice beyond everyday habits (sleep, walking, water, rest).
- "headline": one short sentence that sets the tone of the day, at most 60 characters.
- "headlineHighlight": the key phrase of the headline, copied verbatim from it (character for character); "headlineCategory" is the category it is about (sleep, activity, recovery or body).
- "insights": 1 to 4, most important first, at most one per category, only for categories with data. Each has:
  - "category": sleep, activity, recovery or body;
  - "text": one sentence, at most 160 characters, built around the numbers that matter;
  - "highlights": 0 to 3 short phrases (at most 40 characters each) copied verbatim from that same "text" — usually the numbers and the verdict;
  - "stat" (optional): the one number of the insight, {"value": at most 12 characters, "unit": at most 16, "caption": a few words of context, at most 40}.
- "nudge": one everyday habit to try today, one sentence, at most 140 characters. No medical advice.
- "categories": one short sentence per category, or null.
- "memorySuggestion": only when the snapshot and the known memories show a lasting pattern worth remembering long-term — never a one-day event, never something the memories already say. Shape: {"section":"profile","key":"kebab-case-key","summary":"one sentence"}. Otherwise null.
Example (for a different person; write your own from the snapshot):
{"headline":"睡得很足，动得有点少。","headlineHighlight":"动得有点少","headlineCategory":"activity","insights":[{"category":"sleep","text":"昨晚睡了 11 小时 22 分，比平时多出将近 5 小时。","highlights":["11 小时 22 分"],"stat":{"value":"11:22","unit":"小时","caption":"比平时 +5h"}},{"category":"recovery","text":"HRV 56.7 ms，高于你的 46.9 基线，身体恢复得不错。","highlights":["56.7 ms","身体恢复得不错"],"stat":{"value":"56.7","unit":"ms HRV","caption":"高于基线 46.9"}},{"category":"activity","text":"今天只走了 1,198 步，离 8,000 的目标还差不少。","highlights":["1,198 步"],"stat":{"value":"1,198","unit":"步","caption":"目标 8,000"}}],"nudge":"傍晚前散步 20 分钟，给这一天收个尾。","categories":{"sleep":"睡得比平时久很多。","activity":"步数离目标还远。","recovery":"HRV 高于基线。","body":null},"memorySuggestion":null}
Respond ONLY with JSON in exactly that shape.`

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
    // The older summary-only shape is not what we ask for, so the first answer in it is retried; on the last
    // attempt it still beats no note at all (the phone shows its Markdown summary).
    if (parsed && (parsed.insights || attempt === 2)) {
      logger.info('health', 'Summary written', {
        ms: Date.now() - started,
        attempt,
        stories: Boolean(parsed.insights)
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
