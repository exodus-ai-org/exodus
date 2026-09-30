import { afterAll, describe, expect, it, vi } from 'vitest'

// Real SQL against a real, in-memory PGlite with the shipped migrations, so
// the run grouping is tested on the columns and indexes the app has.
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

type Attempt = 'chosen' | 'folded' | 'hidden'

/**
 * `runs` exchanges, each 0–3 tool steps then an answer, with random text
 * sizes. About one exchange in three is a settled regenerate group: up to
 * three attempts at it, one of them `chosen` — the rest `folded` (one) and
 * `hidden`, their text written in `#` so it can be told if any of it gets
 * out. Returns how many runs the model may see.
 */
async function seedChat(chatId: string, random: () => number, runs: number) {
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${chatId}','t')`
  )
  let t = 0
  const rows: string[] = []
  const sql = (v: string | null) => (v === null ? 'NULL' : `'${v}'`)
  const row = (
    runId: string,
    role: string,
    content: unknown,
    toolCallId: string | null,
    toolName: string | null
  ) =>
    rows.push(
      `('${crypto.randomUUID()}','${chatId}','${runId}','${role}',${q(content)},` +
        `${sql(toolCallId)},${sql(toolName)},` +
        `${toolCallId ? 'false' : 'NULL'},NULL,NULL,'${at(t++)}')`
    )
  const text = (c: string) => c.repeat(1 + Math.floor(random() * 400))

  const run = (
    index: string,
    seen: boolean,
    alternateOf: string | null,
    attempt: Attempt | null
  ) => {
    const runId = crypto.randomUUID()
    const c = (visible: string) => (seen ? visible : '#')
    rows.push(
      `('${runId}','${chatId}','${runId}','user',${q([{ type: 'text', text: text(c('q')) }])},NULL,NULL,NULL,${sql(alternateOf)},${sql(attempt)},'${at(t++)}')`
    )
    const steps = Math.floor(random() * 4)
    for (let s = 0; s < steps; s++) {
      const callId = `call_${index}_${s}`
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
        [{ type: 'text', text: text(c('r')).repeat(2) }],
        callId,
        'weather'
      )
    }
    row(runId, 'assistant', [{ type: 'text', text: text(c('a')) }], null, null)
    return runId
  }

  for (let r = 0; r < runs; r++) {
    if (random() >= 1 / 3) {
      run(`${r}`, true, null, null)
      continue
    }
    const attempts = 2 + Math.floor(random() * 2)
    const chosen = Math.floor(random() * attempts)
    const folded =
      (chosen + 1 + Math.floor(random() * (attempts - 1))) % attempts
    let first: string | null = null
    for (let a = 0; a < attempts; a++) {
      const state: Attempt =
        a === chosen ? 'chosen' : a === folded ? 'folded' : 'hidden'
      const id = run(`${r}_${a}`, a === chosen, first, state)
      first ??= id
    }
  }
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","toolCallId","toolName","isError","alternateOf","attempt","createdAt") VALUES ${rows.join(',')}`
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
      // And the tail really is the last `tail` runs (or all of them): every
      // exchange has one run the model sees, regenerated or not.
      const userCount = messages.filter((m) => m.role === 'user').length
      expect(userCount).toBeGreaterThanOrEqual(Math.min(tail, runs))
      // Nothing of an attempt that was folded or hidden gets out.
      expect(JSON.stringify(messages.map((m) => m.content))).not.toContain('#')
    })
  }
})
