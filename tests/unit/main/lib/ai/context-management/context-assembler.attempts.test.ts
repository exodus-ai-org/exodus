import { afterAll, describe, expect, it, vi } from 'vitest'

// Regenerate groups (spec 2026-09-26 §3): the model sees the answer that was
// kept, never the one that was not — and a regenerate sees no other attempt
// of its group at all. Real SQL on an in-memory PGlite, as the assembler's
// other tests.
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0011')
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const { assembleContext } =
  await import('@main/lib/ai/context-management/context-assembler')
const { dropBrokenRuns } = await import('@main/lib/ai/kernel/invariant')

afterAll(async () => {
  await pglite.close()
})

type RunSpec = {
  /** A name for the run; its answer reads `answer of <name>`. */
  name: string
  attempt?: 'comparing' | 'chosen' | 'folded' | 'hidden'
  /** The name of the group's first run. */
  alternateOf?: string
  /** A run that has asked and not been answered yet. */
  unanswered?: boolean
}

const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString()
const q = (v: unknown) =>
  v === null || v === undefined
    ? 'NULL'
    : `'${(typeof v === 'string' ? v : JSON.stringify(v)).replaceAll("'", "''")}'`

/** Seeds a chat with the runs given, oldest first; returns ids by name. */
async function seed(runs: RunSpec[]) {
  const chatId = crypto.randomUUID()
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${chatId}','t')`
  )
  const ids = new Map(runs.map((r) => [r.name, crypto.randomUUID()]))
  const rows: string[] = []
  let t = 0
  for (const run of runs) {
    const runId = ids.get(run.name)!
    const group = run.alternateOf ? ids.get(run.alternateOf)! : null
    rows.push(
      `('${runId}','${chatId}','${runId}','user',${q(JSON.stringify([{ type: 'text', text: `question of ${run.name}` }]))},${q(group)},${q(run.attempt)},'${at(t++)}')`
    )
    if (run.unanswered) continue
    rows.push(
      `('${crypto.randomUUID()}','${chatId}','${runId}','assistant',${q(JSON.stringify([{ type: 'text', text: `answer of ${run.name}` }]))},NULL,NULL,'${at(t++)}')`
    )
  }
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","alternateOf","attempt","createdAt") VALUES ${rows.join(',')}`
  )
  return { chatId, id: (name: string) => ids.get(name)! }
}

/** What the model would read, as the text of each message in order. */
function texts(messages: Array<{ content: unknown }>): string[] {
  return messages.map((m) =>
    (m.content as Array<{ text: string }>).map((b) => b.text).join('')
  )
}

describe('assembleContext and regenerate groups', () => {
  it('leaves out the answer that was not kept', async () => {
    const { chatId, id } = await seed([
      { name: 'A' },
      { name: 'G', attempt: 'folded' },
      { name: 'R1', attempt: 'chosen', alternateOf: 'G' },
      { name: 'Z', unanswered: true }
    ])

    const { messages } = await assembleContext(chatId, 100_000, 6, {
      runId: id('Z'),
      alternateOf: null
    })

    expect(texts(messages)).toEqual([
      'question of A',
      'answer of A',
      'question of R1',
      'answer of R1',
      'question of Z'
    ])
  })

  it('leaves out attempts older than the newest two', async () => {
    const { chatId } = await seed([
      { name: 'G', attempt: 'hidden' },
      { name: 'R1', attempt: 'folded', alternateOf: 'G' },
      { name: 'R2', attempt: 'chosen', alternateOf: 'G' }
    ])

    const { messages } = await assembleContext(chatId, 100_000, 6)

    expect(texts(messages)).toEqual(['question of R2', 'answer of R2'])
  })

  it('shows a regenerate nothing of the answers it stands beside', async () => {
    const { chatId, id } = await seed([
      { name: 'A' },
      { name: 'G', attempt: 'hidden' },
      { name: 'R1', attempt: 'comparing', alternateOf: 'G' },
      { name: 'R2', attempt: 'comparing', alternateOf: 'G', unanswered: true }
    ])

    const { messages } = await assembleContext(chatId, 100_000, 6, {
      runId: id('R2'),
      alternateOf: id('G')
    })

    expect(texts(messages)).toEqual([
      'question of A',
      'answer of A',
      'question of R2'
    ])
  })

  it('counts the fresh tail in runs the model sees', async () => {
    const { chatId } = await seed([
      { name: 'A' },
      { name: 'B' },
      { name: 'G', attempt: 'folded' },
      { name: 'R1', attempt: 'chosen', alternateOf: 'G' }
    ])

    // No room to back-fill: what comes back is the fresh tail alone. With a
    // tail of two runs that is B and R1 — the folded G is not one of them.
    const { messages } = await assembleContext(chatId, 1, 2)

    expect(texts(messages)).toEqual([
      'question of B',
      'answer of B',
      'question of R1',
      'answer of R1'
    ])
  })

  it('still hands over whole runs, in an order a provider accepts', async () => {
    const { chatId, id } = await seed([
      { name: 'A' },
      { name: 'G', attempt: 'comparing' },
      { name: 'R1', attempt: 'comparing', alternateOf: 'G', unanswered: true }
    ])

    const { messages } = await assembleContext(chatId, 100_000, 6, {
      runId: id('R1'),
      alternateOf: id('G')
    })

    expect(messages[0].role).toBe('user')
    expect(dropBrokenRuns(messages)).toEqual({ messages, dropped: 0 })
  })
})
