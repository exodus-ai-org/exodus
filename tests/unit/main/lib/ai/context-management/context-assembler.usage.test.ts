import type { Context, Model } from '@earendil-works/pi-ai'
import { clampMaxTokensToContext } from '@earendil-works/pi-ai/api/simple-options'
import { afterAll, describe, expect, it, vi } from 'vitest'

// What the assembler hands to pi has to satisfy pi. Every provider builds its
// request through `clampMaxTokensToContext`, which estimates the context from
// the `usage` of the assistant messages in it — so from a chat's second
// request on, a message rebuilt without `usage` fails the request before it
// is sent ("Cannot read properties of undefined (reading 'totalTokens')").
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

afterAll(async () => {
  await pglite.close()
})

const model = { contextWindow: 200_000 } as Model<string>
const USAGE = {
  input: 1200,
  output: 300,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 1500,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
}

const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString()
const q = (v: unknown) =>
  v === null ? 'NULL' : `'${JSON.stringify(v).replaceAll("'", "''")}'`

/** One finished run (a tool step, then the answer) and the next user message. */
async function seedFollowUp(usage: unknown): Promise<string> {
  const chatId = crypto.randomUUID()
  const first = crypto.randomUUID()
  const second = crypto.randomUUID()
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${chatId}','t')`
  )
  const text = (t: string) => [{ type: 'text', text: t }]
  const call = [
    { type: 'toolCall', id: 'call_1', name: 'weather', arguments: {} }
  ]
  const rows = [
    `('${first}','${chatId}','${first}','user',${q(text('q1'))},NULL,NULL,NULL,NULL,'${at(0)}')`,
    `('${crypto.randomUUID()}','${chatId}','${first}','assistant',${q(call)},${q(usage)},NULL,NULL,NULL,'${at(1)}')`,
    `('${crypto.randomUUID()}','${chatId}','${first}','toolResult',${q(text('sunny'))},NULL,'call_1','weather',false,'${at(2)}')`,
    `('${crypto.randomUUID()}','${chatId}','${first}','assistant',${q(text('a1'))},${q(usage)},NULL,NULL,NULL,'${at(3)}')`,
    `('${second}','${chatId}','${second}','user',${q(text('q2'))},NULL,NULL,NULL,NULL,'${at(4)}')`
  ]
  await pglite.exec(
    `INSERT INTO "message" ("id","chatId","runId","role","content","usage","toolCallId","toolName","isError","createdAt") VALUES ${rows.join(',')}`
  )
  return chatId
}

const contextOf = async (chatId: string): Promise<Context> => ({
  systemPrompt: 'system',
  messages: (await assembleContext(chatId, 100_000, 6)).messages
})

describe('assembleContext hands pi assistant messages it can read', () => {
  it("passes pi's max-token clamp on a follow-up request", async () => {
    const context = await contextOf(await seedFollowUp(USAGE))

    expect(clampMaxTokensToContext(model, context, 8192)).toBe(8192)
  })

  it('keeps the usage the row recorded', async () => {
    const { messages } = await contextOf(await seedFollowUp(USAGE))

    const assistants = messages.filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(2)
    for (const m of assistants) expect(m.usage).toEqual(USAGE)
  })

  it('gives a row saved without usage a zero usage', async () => {
    const context = await contextOf(await seedFollowUp(null))

    const assistants = context.messages.filter((m) => m.role === 'assistant')
    for (const m of assistants) expect(m.usage.totalTokens).toBe(0)
    expect(clampMaxTokensToContext(model, context, 8192)).toBe(8192)
  })

  it('gives a row whose usage is not in pi’s shape a zero usage', async () => {
    const legacy = { promptTokens: 10, completionTokens: 5 }
    const context = await contextOf(await seedFollowUp(legacy))

    const assistants = context.messages.filter((m) => m.role === 'assistant')
    for (const m of assistants) expect(m.usage.totalTokens).toBe(0)
    expect(clampMaxTokensToContext(model, context, 8192)).toBe(8192)
  })
})
