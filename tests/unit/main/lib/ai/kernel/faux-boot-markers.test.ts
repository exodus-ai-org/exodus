// src/main/lib/ai/kernel/faux-boot.ts
// The e2e's faux provider tells the engine's one-shot calls apart by a
// substring of their system prompt. A rewording of one of those prompts
// would silently route it to the wrong scripted reply (the e2e fails, far
// from the cause) — so each marker is pinned here to the live prompt text.
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))
vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { FAUX_PROMPT_MARKERS } = await import('@main/lib/ai/kernel/faux-boot')
const { CONSOLIDATE_SYSTEM, INSTRUCTION_SYSTEM, READ_FILTER_SYSTEM } =
  await import('@main/lib/ai/memory/manager')
const { formatRunMemory } = await import('@main/lib/ai/memory/run-memory')
const { titleGenerationPrompt } = await import('@main/lib/ai/prompts')

describe('faux-boot prompt markers', () => {
  it('the title marker is in the title generator’s prompt', () => {
    expect(titleGenerationPrompt).toContain(FAUX_PROMPT_MARKERS.title)
  })

  it('the read-filter marker is in the read filter’s system prompt', () => {
    expect(READ_FILTER_SYSTEM).toContain(FAUX_PROMPT_MARKERS.readFilter)
  })

  it('the instruction marker is in the instruction engine’s system prompt', () => {
    expect(INSTRUCTION_SYSTEM).toContain(FAUX_PROMPT_MARKERS.instruction)
  })

  it('the consolidate marker is in consolidation’s system prompt', () => {
    expect(CONSOLIDATE_SYSTEM).toContain(FAUX_PROMPT_MARKERS.consolidate)
  })

  it('the user-memory marker is in the block a run’s question carries', () => {
    const block = formatRunMemory([
      {
        id: '11111111-1111-4111-8111-111111111111',
        section: 'topic',
        key: 'Classical Music',
        summary: 'Likes Bach.',
        details: []
      } as never
    ])
    expect(block).toContain(FAUX_PROMPT_MARKERS.userMemory)
  })

  it('no marker matches another engine prompt (each call has one route)', () => {
    const prompts = [
      titleGenerationPrompt,
      READ_FILTER_SYSTEM,
      INSTRUCTION_SYSTEM,
      CONSOLIDATE_SYSTEM
    ]
    const markers = [
      FAUX_PROMPT_MARKERS.title,
      FAUX_PROMPT_MARKERS.readFilter,
      FAUX_PROMPT_MARKERS.instruction,
      FAUX_PROMPT_MARKERS.consolidate
    ]
    prompts.forEach((prompt, i) => {
      markers.forEach((marker, j) => {
        expect(prompt.includes(marker)).toBe(i === j)
      })
    })
  })
})
