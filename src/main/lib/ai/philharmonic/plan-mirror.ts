// src/main/lib/ai/philharmonic/plan-mirror.ts
import { renameSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'

import type { ConversationPlan, PlanStep } from '../../db/schema'
import { getGroupDir } from '../../paths'

const STATUS_GLYPH: Record<PlanStep['status'], string> = {
  pending: '[ ]',
  running: '[~]',
  done: '[x]',
  skipped: '[s]',
  failed: '[!]'
}

function snippet(s: string, max = 120): string {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function elapsedLabel(plan: ConversationPlan): string {
  const ms = Date.now() - new Date(plan.createdAt).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

export function formatPlanMarkdown(
  plan: ConversationPlan,
  steps: PlanStep[]
): string {
  const done = steps.filter((s) => s.status === 'done').length
  const lines: string[] = []
  lines.push(`# ${plan.summary}`, '')
  lines.push(
    `> Status: ${plan.status} · ${done}/${steps.length} done · ${elapsedLabel(plan)}`,
    ''
  )
  for (const s of steps) {
    const glyph = STATUS_GLYPH[s.status]
    const intent = s.intent ? ` — _${snippet(s.intent, 80)}_` : ''
    const out =
      s.status === 'done' && s.output
        ? ` — _${snippet(s.output, 160)}_`
        : s.status === 'running'
          ? ` — _running…_'`
          : ''
    lines.push(`${s.ordinal + 1}. ${glyph} **${s.title}**${intent}${out}`)
  }
  return lines.join('\n') + '\n'
}

/**
 * Atomic markdown rewrite for the current plan. Writes to plan.md.tmp then
 * renames, so an outside reader never observes a partial file.
 */
export async function writePlanMirror(
  conversationId: string,
  plan: ConversationPlan,
  steps: PlanStep[]
): Promise<string> {
  const dir = getGroupDir(conversationId)
  const finalPath = join(dir, 'plan.md')
  const tmpPath = join(dir, 'plan.md.tmp')
  await writeFile(tmpPath, formatPlanMarkdown(plan, steps), 'utf-8')
  renameSync(tmpPath, finalPath)
  return finalPath
}
