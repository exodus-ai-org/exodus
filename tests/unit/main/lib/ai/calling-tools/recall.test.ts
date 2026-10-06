// `recall` (spec 2026-10-01 §B3): what an aged digest points back to — the
// stored output of an earlier call, or a numbered source's full text — read
// from the database, byte for byte, on a real in-memory PGlite.
import { randomUUID } from 'crypto'

import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0012')
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const { recall } = await import('@main/lib/ai/calling-tools/recall')

afterAll(async () => {
  await pglite.close()
})

let clock = Date.parse('2026-01-01T00:00:00Z')
const tick = () => new Date((clock += 60_000))

async function newChat(): Promise<string> {
  const id = randomUUID()
  await pglite.query(`INSERT INTO "chat" ("id","title") VALUES ($1,'t')`, [id])
  return id
}

/** A run with one call: the question, the call, its result. */
async function addCall(
  chatId: string,
  opts: {
    callId: string
    toolName: string
    args: Record<string, unknown>
    content: unknown[]
    details?: unknown
    isError?: boolean
  }
) {
  const runId = randomUUID()
  await pglite.query(
    `INSERT INTO "message" ("id","chatId","runId","role","content","createdAt") VALUES ($1,$2,$1,'user','"q"',$3)`,
    [runId, chatId, tick()]
  )
  await pglite.query(
    `INSERT INTO "message" ("id","chatId","runId","role","content","createdAt") VALUES ($1,$2,$3,'assistant',$4,$5)`,
    [
      randomUUID(),
      chatId,
      runId,
      JSON.stringify([
        {
          type: 'toolCall',
          id: opts.callId,
          name: opts.toolName,
          arguments: opts.args
        }
      ]),
      tick()
    ]
  )
  await pglite.query(
    `INSERT INTO "message" ("id","chatId","runId","role","content","toolCallId","toolName","details","isError","createdAt")
     VALUES ($1,$2,$3,'toolResult',$4,$5,$6,$7,$8,$9)`,
    [
      randomUUID(),
      chatId,
      runId,
      JSON.stringify(opts.content),
      opts.callId,
      opts.toolName,
      JSON.stringify(opts.details ?? null),
      opts.isError ?? false,
      tick()
    ]
  )
}

const run = async (chatId: string, params: Record<string, unknown>) => {
  const out = await recall(chatId).execute('rc', params as never)
  return {
    text: out.content
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('\n'),
    content: out.content
  }
}

describe('recall({ call })', () => {
  it('gives back the call’s arguments and its result, as stored', async () => {
    const chatId = await newChat()
    const output = 'line\n'.repeat(500)
    await addCall(chatId, {
      callId: 'toolu_1',
      toolName: 'terminal',
      args: { command: 'ls -la' },
      content: [{ type: 'text', text: output }]
    })
    const { text, content } = await run(chatId, { call: 'toolu_1' })
    expect(text).toContain('terminal')
    expect(text).toContain('{"command":"ls -la"}')
    expect(content.at(-1)).toEqual({ type: 'text', text: output })
  })

  it('gives back images as images', async () => {
    const chatId = await newChat()
    const image = { type: 'image', data: 'AAAA', mimeType: 'image/png' }
    await addCall(chatId, {
      callId: 'c_img',
      toolName: 'computer_use',
      args: { task: 'look' },
      content: [{ type: 'text', text: 'Saw it.' }, image]
    })
    const { content } = await run(chatId, { call: 'c_img' })
    expect(content).toContainEqual(image)
  })

  it('reads only this conversation', async () => {
    const other = await newChat()
    await addCall(other, {
      callId: 'elsewhere',
      toolName: 'terminal',
      args: { command: 'cat secret' },
      content: [{ type: 'text', text: 'not yours' }]
    })
    const { text } = await run(await newChat(), { call: 'elsewhere' })
    expect(text).not.toContain('not yours')
    expect(text).toContain('No call elsewhere')
  })
})

describe('recall({ source })', () => {
  it('gives back a numbered source’s full text', async () => {
    const chatId = await newChat()
    await addCall(chatId, {
      callId: 's1',
      toolName: 'web_search',
      args: { query: 'q' },
      content: [{ type: 'text', text: 'results' }],
      details: [
        {
          rank: 3,
          link: 'https://a.example/x',
          title: 'A page',
          content: 'The extract the model read.',
          snippet: 'short'
        }
      ]
    })
    const { text } = await run(chatId, { source: 3 })
    expect(text).toContain('[3] A page')
    expect(text).toContain('https://a.example/x')
    expect(text).toContain('The extract the model read.')
  })

  it('says so when no source has that number', async () => {
    const { text } = await run(await newChat(), { source: 9 })
    expect(text).toContain('No source 9')
  })
})

it('asks for one of the two when given neither', async () => {
  const { text } = await run(await newChat(), {})
  expect(text).toContain('source')
  expect(text).toContain('call')
})
