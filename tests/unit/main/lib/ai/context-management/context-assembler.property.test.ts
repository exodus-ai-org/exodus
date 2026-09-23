import { afterAll, describe, expect, it, vi } from 'vitest'

// Real SQL against a real, in-memory PGlite with the shipped migrations, so
// the run grouping is tested on the columns and indexes the app has.
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0008')
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const { assembleContext } =
  await import('@main/lib/ai/context-management/context-assembler')
const { dropBrokenRuns } = await import('@main/lib/ai/kernel/invariant')

afterAll(async () => {
  await pglite.close()
})

/** A seeded PRNG so a failing seed reproduces. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString()
const q = (v: unknown) => `'${JSON.stringify(v).replaceAll("'", "''")}'`

/** `runs` runs, each 0–3 tool steps then an answer, with random text sizes. */
async function seedChat(chatId: string, random: () => number, runs: number) {
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${chatId}','t')`
  )
  let t = 0
  const rows: string[] = []
  const row = (
    runId: string,
    role: string,
    content: unknown,
    toolCallId: string | null,
    toolName: string | null
  ) =>
    rows.push(
      `('${crypto.randomUUID()}','${chatId}','${runId}','${role}',${q(content)},` +
        `${toolCallId ? `'${toolCallId}'` : 'NULL'},${toolName ? `'${toolName}'` : 'NULL'},` +
        `${toolCallId ? 'false' : 'NULL'},'${at(t++)}')`
    )
  const text = (c: string) => c.repeat(1 + Math.floor(random() * 400))
  for (let r = 0; r < runs; r++) {
    const runId = crypto.randomUUID()
    rows.push(
      `('${runId}','${chatId}','${runId}','user',${q([{ type: 'text', text: text('q') }])},NULL,NULL,NULL,'${at(t++)}')`
    )
    const steps = Math.floor(random() * 4)
    for (let s = 0; s < steps; s++) {
      const callId = `call_${r}_${s}`
      row(
        runId,
        'assistant',
        [{ type: 'toolCall', id: callId, name: 'weather', arguments: {} }],
        null,
        null
      )
      row(
        runId,
        'toolResult',
        [{ type: 'text', text: text('r').repeat(2) }],
        callId,
        'weather'
      )
    }
    row(runId, 'assistant', [{ type: 'text', text: text('a') }], null, null)
  }
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","toolCallId","toolName","isError","createdAt") VALUES ${rows.join(',')}`
  )
}

describe('assembleContext keeps runs whole', () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`seed ${seed}`, async () => {
      const random = rng(seed)
      const chatId = crypto.randomUUID()
      const runs = 1 + Math.floor(random() * 12)
      await seedChat(chatId, random, runs)
      const budget = 50 + Math.floor(random() * 3000)
      const tail = 1 + Math.floor(random() * 4)

      const { messages } = await assembleContext(chatId, budget, tail)

      // The fresh tail is always present whole, whatever the budget, so the
      // list is never empty and always opens with a user message.
      expect(messages.length).toBeGreaterThan(0)
      expect(messages[0].role).toBe('user')
      expect(dropBrokenRuns(messages)).toEqual({ messages, dropped: 0 })
      // Whole runs only: the last message is the last run's final answer.
      expect(messages.at(-1)?.role).toBe('assistant')
      // And the tail really is the last `tail` runs (or all of them).
      const userCount = messages.filter((m) => m.role === 'user').length
      expect(userCount).toBeGreaterThanOrEqual(Math.min(tail, runs))
    })
  }
})
