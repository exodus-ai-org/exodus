import type { Model } from '@earendil-works/pi-ai'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

// Real SQL against a real, in-memory PGlite with the shipped migrations, so
// the before/after snapshots are built from the rows the app actually stores.
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0008')
  return { pglite, db: drizzle(pglite) }
})

const mockCompleteSimple = vi.fn()
vi.mock('@main/lib/ai/kernel/models', () => ({
  getKernelModels: () => ({
    completeSimple: (...args: unknown[]) => mockCompleteSimple(...args)
  })
}))

const { pglite } = await import('@main/lib/db/db')
const { createMemory, getMemoryById, restoreMemory } =
  await import('@main/lib/db/memory-queries')
const { runMemoryInstruction, LOCAL_USER_ID } =
  await import('@main/lib/ai/memory/manager')

const model = { id: 'm' } as unknown as Model<string>

/** Scripts the next `completeSimple` call to answer with this text. */
function reply(text: string) {
  mockCompleteSimple.mockResolvedValueOnce({
    content: [{ type: 'text', text }]
  })
}

afterAll(async () => {
  await pglite.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runMemoryInstruction', () => {
  it('reports before/after for each op', async () => {
    const work = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'profile',
      key: 'Work setup',
      summary: 'Uses macOS',
      details: ['MacBook'],
      source: 'explicit'
    })
    const old = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'person',
      key: 'Old address',
      summary: 'Lived in Lyon',
      source: 'implicit'
    })

    reply(
      JSON.stringify({
        operations: [
          {
            op: 'update',
            id: work.id,
            section: 'profile',
            key: 'Work setup',
            summary: 'Uses Linux',
            details: ['ThinkPad']
          },
          { op: 'delete', id: old.id },
          {
            op: 'create',
            section: 'topic',
            key: 'Rust',
            summary: 'Learning Rust',
            details: []
          }
        ]
      })
    )

    const { applied, changes } = await runMemoryInstruction(
      'I use Linux now…',
      null,
      model,
      'k'
    )

    expect(applied).toBe(3)
    expect(changes[0]).toEqual({
      op: 'update',
      id: work.id,
      before: {
        section: 'profile',
        key: 'Work setup',
        summary: 'Uses macOS',
        details: ['MacBook'],
        isActive: true
      },
      after: {
        section: 'profile',
        key: 'Work setup',
        summary: 'Uses Linux',
        details: ['ThinkPad'],
        isActive: true
      }
    })
    expect(changes[1]).toEqual({
      op: 'delete',
      id: old.id,
      before: expect.objectContaining({ key: 'Old address' }),
      after: null
    })
    expect(changes[2]).toMatchObject({
      op: 'create',
      before: null,
      after: expect.objectContaining({ key: 'Rust' })
    })
    expect(await getMemoryById(changes[2].id)).not.toBeNull()
  })

  it('an instruction that needs no change returns no changes', async () => {
    reply(JSON.stringify({ operations: [] }))

    const result = await runMemoryInstruction(
      'nothing worth changing here',
      null,
      model,
      'k'
    )

    expect(result).toEqual({ applied: 0, changes: [] })
  })

  it('an unknown id is ignored, not reported', async () => {
    reply(
      JSON.stringify({
        operations: [
          {
            op: 'update',
            id: 'nope',
            section: 'topic',
            key: 'X',
            summary: 'y',
            details: []
          }
        ]
      })
    )

    const result = await runMemoryInstruction(
      'update the entry with id nope',
      null,
      model,
      'k'
    )

    expect(result).toEqual({ applied: 0, changes: [] })
  })

  it("a second update on the same id reads before from the first update's after", async () => {
    const entry = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'topic',
      key: 'Rust',
      summary: 'Learning Rust',
      details: ['Reading the book'],
      source: 'explicit'
    })

    reply(
      JSON.stringify({
        operations: [
          {
            op: 'update',
            id: entry.id,
            section: 'topic',
            key: 'Rust',
            summary: 'Learning Rust — week 2',
            details: ['Built a CLI']
          },
          {
            op: 'update',
            id: entry.id,
            section: 'topic',
            key: 'Rust',
            summary: 'Learning Rust — week 3',
            details: ['Built a CLI', 'Wrote a parser']
          }
        ]
      })
    )

    const { changes } = await runMemoryInstruction(
      'update it twice',
      null,
      model,
      'k'
    )

    expect(changes).toHaveLength(2)
    expect(changes[1].before).toEqual(changes[0].after)
    expect(changes[1].after).toEqual({
      section: 'topic',
      key: 'Rust',
      summary: 'Learning Rust — week 3',
      details: ['Built a CLI', 'Wrote a parser'],
      isActive: true
    })
  })

  it("a delete after an update on the same id reads before from the update's after", async () => {
    const entry = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'topic',
      key: 'Go',
      summary: 'Learning Go',
      details: [],
      source: 'explicit'
    })

    reply(
      JSON.stringify({
        operations: [
          {
            op: 'update',
            id: entry.id,
            section: 'topic',
            key: 'Go',
            summary: 'Learning Go — done with the tour',
            details: ['Finished the tour']
          },
          { op: 'delete', id: entry.id }
        ]
      })
    )

    const { changes } = await runMemoryInstruction(
      'update then delete it',
      null,
      model,
      'k'
    )

    expect(changes).toHaveLength(2)
    expect(changes[1].op).toBe('delete')
    expect(changes[1].before).toEqual(changes[0].after)
    expect(changes[1].after).toBeNull()
  })

  it('still throws on an unparseable reply', async () => {
    reply('not json')

    await expect(
      runMemoryInstruction('do something', null, model, 'k')
    ).rejects.toThrow("Couldn't interpret")
  })
})

describe('restoreMemory', () => {
  it('inserts under the given id and getMemoryById returns it', async () => {
    const id = crypto.randomUUID()

    await restoreMemory(
      id,
      LOCAL_USER_ID,
      {
        section: 'topic',
        key: 'Restored',
        summary: 'Back from the dead',
        details: ['a bullet'],
        isActive: true
      },
      'system'
    )

    const row = await getMemoryById(id)
    expect(row).not.toBeNull()
    expect(row?.id).toBe(id)
    expect(row?.key).toBe('Restored')
    expect(row?.details).toEqual(['a bullet'])
    expect(row?.isActive).toBe(true)
  })
})
