import type { Message } from '@earendil-works/pi-ai'
import {
  formatRunMemory,
  runMemoryBlocks,
  withRunMemory
} from '@main/lib/ai/memory/run-memory'
import type { MemoryRow } from '@main/lib/db/memory-queries'
import { describe, expect, it } from 'vitest'

function memory(
  id: string,
  over: Partial<MemoryRow> & Pick<MemoryRow, 'key' | 'section'>
): MemoryRow {
  return {
    id,
    userId: 'local',
    summary: `${over.key} summary`,
    details: [],
    isActive: true,
    ...over
  } as MemoryRow
}

const work = memory('m1', {
  key: 'Work setup',
  section: 'profile',
  details: ['Uses a Mac']
})
const music = memory('m2', { key: 'Classical Music', section: 'topic' })
const mom = memory('m3', { key: 'Mom', section: 'person' })

// The memory the read filter chose for a message used to close the system
// prompt — chosen afresh on every message, so the system prompt, and every
// message after it, missed the provider's cache every time (2026-10-01).
// It now goes with the run it was chosen for.
describe('formatRunMemory', () => {
  it('is the same bytes whatever order the entries come in', () => {
    expect(formatRunMemory([music, work, mom])).toBe(
      formatRunMemory([mom, music, work])
    )
  })

  it('orders by section, then key, and keeps each entry whole', () => {
    const block = formatRunMemory([music, mom, work])
    expect(block.startsWith('<user_memory>')).toBe(true)
    expect(block.endsWith('</user_memory>')).toBe(true)
    expect(block.indexOf('## Work setup')).toBeLessThan(
      block.indexOf('## Classical Music')
    )
    expect(block.indexOf('## Classical Music')).toBeLessThan(
      block.indexOf('## Mom')
    )
    expect(block).toContain('- Uses a Mac')
  })

  it('is empty for no entries', () => {
    expect(formatRunMemory([])).toBe('')
  })
})

describe('runMemoryBlocks', () => {
  const usage = {
    r1: [
      { id: 'm1', key: 'Work setup', section: 'profile' as const },
      { id: 'm2', key: 'Classical Music', section: 'topic' as const }
    ],
    r2: [{ id: 'gone', key: 'Old', section: 'topic' as const }]
  }

  it('renders each run from the entries as they read now', () => {
    const edited = { ...work, summary: 'Moved to Linux' }
    const blocks = runMemoryBlocks(usage, [edited, music])
    expect(blocks.get('r1')).toContain('Moved to Linux')
    expect(blocks.get('r1')).not.toContain('Work setup summary')
  })

  // Deleting a memory removes it from what the model is told — in every run.
  it('leaves out an entry since deleted or switched off', () => {
    const off = { ...music, isActive: false }
    const blocks = runMemoryBlocks(usage, [work, off])
    expect(blocks.get('r1')).toContain('## Work setup')
    expect(blocks.get('r1')).not.toContain('Classical Music')
    expect(blocks.has('r2')).toBe(false)
  })
})

describe('withRunMemory', () => {
  const block = formatRunMemory([work])

  it('puts the block before the question, in the same message', () => {
    const asked = {
      role: 'user',
      content: [{ type: 'text', text: 'What should I buy?' }],
      timestamp: 1
    } as Message
    const out = withRunMemory(asked, block)
    expect(out.content).toEqual([
      { type: 'text', text: block },
      { type: 'text', text: 'What should I buy?' }
    ])
    expect(asked.content).toHaveLength(1) // the original is untouched
  })

  it('turns a plain-string question into parts', () => {
    const asked = { role: 'user', content: 'Hi', timestamp: 1 } as Message
    expect(withRunMemory(asked, block).content).toEqual([
      { type: 'text', text: block },
      { type: 'text', text: 'Hi' }
    ])
  })

  it('returns the message itself when there is no block', () => {
    const asked = { role: 'user', content: 'Hi', timestamp: 1 } as Message
    expect(withRunMemory(asked, '')).toBe(asked)
  })
})
