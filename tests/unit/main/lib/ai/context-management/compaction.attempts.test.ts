import type { Context, Model } from '@earendil-works/pi-ai'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// A folded answer must never reach a summary (spec 2026-09-26 §3): leaf
// compaction summarizes the runs the model sees, and no others. Real SQL on
// an in-memory PGlite; the summarizer is the one thing scripted.
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false }
}))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0011')
  return { pglite, db: drizzle(pglite) }
})

const summarized: string[] = []
vi.mock('@main/lib/ai/kernel/models', () => ({
  getKernelModels: () => ({
    completeSimple: async (_model: unknown, context: Context) => {
      const [prompt] = context.messages
      summarized.push(
        (prompt.content as Array<{ text: string }>).map((b) => b.text).join('')
      )
      return {
        role: 'assistant',
        content: [{ type: 'text', text: 'a summary' }],
        stopReason: 'stop'
      }
    }
  })
}))

const { pglite } = await import('@main/lib/db/db')
const { assembleContext } =
  await import('@main/lib/ai/context-management/context-assembler')
const { runLeafPass } =
  await import('@main/lib/ai/context-management/compaction')

afterAll(async () => {
  await pglite.close()
})
beforeEach(() => {
  summarized.length = 0
})

const model = { id: 'faux-1' } as Model<string>
const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString()
const q = (v: unknown) =>
  v === null || v === undefined
    ? 'NULL'
    : `'${(typeof v === 'string' ? v : JSON.stringify(v)).replaceAll("'", "''")}'`

type RunSpec = {
  name: string
  attempt?: 'chosen' | 'folded' | 'hidden'
  alternateOf?: string
}

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
      `('${runId}','${chatId}','${runId}','user',${q(JSON.stringify([{ type: 'text', text: `question of ${run.name}` }]))},${q(group)},${q(run.attempt)},'${at(t++)}')`,
      `('${crypto.randomUUID()}','${chatId}','${runId}','assistant',${q(JSON.stringify([{ type: 'text', text: `answer of ${run.name}` }]))},NULL,NULL,'${at(t++)}')`
    )
  }
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","alternateOf","attempt","createdAt") VALUES ${rows.join(',')}`
  )
  // The first assembly is what starts tracking the chat's messages.
  await assembleContext(chatId, 100_000, 2)
  return { chatId, id: (name: string) => ids.get(name)! }
}

async function trackedMessages(chatId: string): Promise<string[]> {
  const { rows } = await pglite.query<{ refId: string }>(
    `SELECT "refId" FROM "lcm_context_items" WHERE "chatId" = $1 AND "kind" = 'message'`,
    [chatId]
  )
  return rows.map((r) => r.refId)
}

const texts = (messages: Array<{ content: unknown }>) =>
  messages.map((m) =>
    (m.content as Array<{ text: string }>).map((b) => b.text).join('')
  )

describe('leaf compaction and regenerate groups', () => {
  it('summarizes the answer that was kept and not the one that was not', async () => {
    const { chatId, id } = await seed([
      { name: 'A' },
      { name: 'G', attempt: 'folded' },
      { name: 'R1', attempt: 'chosen', alternateOf: 'G' },
      { name: 'B' },
      { name: 'Y' },
      { name: 'Z' }
    ])

    expect(await runLeafPass(chatId, model, 'k', 2)).toBe(true)

    expect(summarized).toHaveLength(1)
    expect(summarized[0]).toContain('answer of A')
    expect(summarized[0]).toContain('answer of R1')
    expect(summarized[0]).toContain('answer of B')
    expect(summarized[0]).not.toContain('of G')
    // The span it stood in is the summary's now: nothing of it is tracked.
    expect(await trackedMessages(chatId)).not.toContain(id('G'))

    const { messages } = await assembleContext(chatId, 100_000, 2)
    expect(texts(messages).join('\n')).not.toContain('of G')
    expect(texts(messages).slice(-4)).toEqual([
      'question of Y',
      'answer of Y',
      'question of Z',
      'answer of Z'
    ])
  })

  it('keeps the fresh tail at the runs the model sees', async () => {
    // Four runs, two of them out of sight at the end of the chat: with a
    // tail of two, A and R2 are the tail, so there is nothing to compact.
    const { chatId } = await seed([
      { name: 'A' },
      { name: 'G', attempt: 'hidden' },
      { name: 'R1', attempt: 'folded', alternateOf: 'G' },
      { name: 'R2', attempt: 'chosen', alternateOf: 'G' }
    ])

    expect(await runLeafPass(chatId, model, 'k', 2)).toBe(false)
    expect(summarized).toEqual([])
  })
})
