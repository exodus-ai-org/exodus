import type { Context, Model } from '@earendil-works/pi-ai'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Leaf compaction summarises tool output from its digest (spec 2026-10-01
// §B5): a search dump is not paid for a second time, and the summary cites
// sources by number, which `recall` resolves. Real SQL on an in-memory
// PGlite; the summarizer is the one thing scripted.
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false }
}))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0012')
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

const EXTRACT = 'full page extract '.repeat(400)

async function seed() {
  const chatId = crypto.randomUUID()
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${chatId}','t')`
  )
  const rows: string[] = []
  let t = 0
  const add = (runId: string, role: string, content: unknown, extra = {}) => {
    const e = {
      toolCallId: null,
      toolName: null,
      details: null,
      ...extra
    } as Record<string, unknown>
    rows.push(
      `('${role === 'user' ? runId : crypto.randomUUID()}','${chatId}','${runId}','${role}',${q(JSON.stringify(content))},${q(e.toolCallId)},${q(e.toolName)},${q(e.details === null ? null : JSON.stringify(e.details))},'${at(t++)}')`
    )
  }
  for (const name of ['A', 'B', 'C']) {
    const runId = crypto.randomUUID()
    add(runId, 'user', [{ type: 'text', text: `question of ${name}` }])
    if (name === 'A') {
      add(runId, 'assistant', [
        {
          type: 'toolCall',
          id: 'call_s1',
          name: 'web_search',
          arguments: { query: 'q' }
        }
      ])
      add(runId, 'toolResult', [{ type: 'text', text: EXTRACT }], {
        toolCallId: 'call_s1',
        toolName: 'web_search',
        details: [
          {
            rank: 1,
            link: 'https://a.example/x',
            title: 'Source title',
            hostname: 'a.example',
            snippet: 'what it says',
            content: EXTRACT
          }
        ]
      })
    }
    add(runId, 'assistant', [{ type: 'text', text: `answer of ${name}` }])
  }
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","toolCallId","toolName","details","createdAt") VALUES ${rows.join(',')}`
  )
  await assembleContext(chatId, 100_000, 1)
  return chatId
}

describe('leaf compaction and tool output', () => {
  it('summarises a search from its digest, not its dump', async () => {
    const chatId = await seed()
    expect(await runLeafPass(chatId, model, 'k', 1)).toBe(true)
    expect(summarized).toHaveLength(1)
    expect(summarized[0]).toContain(
      '[1] Source title — a.example — what it says'
    )
    expect(summarized[0]).toContain('answer of A')
    expect(summarized[0]).not.toContain(EXTRACT.slice(0, 200))
  })
})
