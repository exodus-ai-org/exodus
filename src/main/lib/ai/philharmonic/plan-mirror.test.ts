// src/main/lib/ai/philharmonic/plan-mirror.test.ts
import { describe, expect, it } from 'vitest'

import type { ConversationPlan, PlanStep } from '../../db/schema'
import { formatPlanMarkdown } from './plan-mirror'

const PLAN: ConversationPlan = {
  id: 'p1',
  conversationId: 'c1',
  summary: 'Launch the brand refresh',
  status: 'active',
  createdAt: new Date(Date.now() - 5 * 60_000),
  updatedAt: new Date(),
  archivedAt: null
}

function step(over: Partial<PlanStep>): PlanStep {
  return {
    id: 'x',
    planId: 'p1',
    ordinal: 0,
    title: 'Step',
    intent: null,
    assignedAgentId: null,
    status: 'pending',
    output: null,
    note: null,
    taskId: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over
  }
}

describe('formatPlanMarkdown', () => {
  it('renders a heading, status line, and per-step rows with correct glyphs', () => {
    const md = formatPlanMarkdown(PLAN, [
      step({
        ordinal: 0,
        title: 'Research market',
        status: 'done',
        output: 'Found 3 competitors with similar positioning.'
      }),
      step({
        ordinal: 1,
        title: 'Draft mood board',
        intent: 'visual direction',
        status: 'running'
      }),
      step({
        ordinal: 2,
        title: 'Wireframe landing',
        intent: 'first cut for review',
        status: 'pending'
      }),
      step({
        ordinal: 3,
        title: 'Stakeholder review',
        status: 'failed'
      }),
      step({
        ordinal: 4,
        title: 'Press release',
        status: 'skipped'
      })
    ])

    expect(md).toMatch(/^# Launch the brand refresh/)
    expect(md).toMatch(/Status: active · 1\/5 done/)
    expect(md).toContain('1. [x] **Research market**')
    expect(md).toContain('2. [~] **Draft mood board** — _visual direction_')
    expect(md).toContain('3. [ ] **Wireframe landing**')
    expect(md).toContain('4. [!] **Stakeholder review**')
    expect(md).toContain('5. [s] **Press release**')
  })

  it('keeps the body even with zero steps', () => {
    const md = formatPlanMarkdown(PLAN, [])
    expect(md).toContain('# Launch the brand refresh')
    expect(md).toContain('0/0 done')
  })
})
