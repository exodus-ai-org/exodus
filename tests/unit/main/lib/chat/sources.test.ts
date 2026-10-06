// A chat's numbered sources (spec 2026-10-01 §B4) on a real, in-memory
// PGlite with the shipped migrations through 0012.
import { randomUUID } from 'crypto'

import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0012')
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const {
  sourcesOfRows,
  saveChatSources,
  ensureChatSources,
  highestSourceRank,
  getChatSource,
  listChatSources
} = await import('@main/lib/chat/sources')

afterAll(async () => {
  await pglite.close()
})

async function newChat(): Promise<string> {
  const id = randomUUID()
  await pglite.query(`INSERT INTO "chat" ("id","title") VALUES ($1,'t')`, [id])
  return id
}

const result = (rank: number, link: string) => ({
  rank,
  link,
  title: `Title ${rank}`,
  content: `Extract of ${rank}`,
  snippet: `Snippet ${rank}`,
  hostname: new URL(link).hostname,
  favicon: 'https://imgs.search.brave.com/f.png',
  thumbnail: 'https://imgs.search.brave.com/t.png',
  siteName: 'Site',
  age: '2 days ago'
})

let clock = Date.parse('2026-01-01T00:00:00Z')
const tick = () => new Date((clock += 60_000))

/** A stored tool-result row, the shape `message` holds. */
function toolRow(
  chatId: string,
  runId: string,
  over: {
    toolName: string
    toolCallId?: string
    details: unknown
    text?: string
    isError?: boolean
  }
) {
  return {
    id: randomUUID(),
    chatId,
    runId,
    role: 'toolResult',
    content: [{ type: 'text', text: over.text ?? 'result text' }],
    toolCallId: over.toolCallId ?? `call_${randomUUID().slice(0, 8)}`,
    toolName: over.toolName,
    details: over.details,
    isError: over.isError ?? false,
    createdAt: tick()
  }
}

async function insertRow(row: ReturnType<typeof toolRow>) {
  await pglite.query(
    `INSERT INTO "message" ("id","chatId","runId","role","content","toolCallId","toolName","details","isError","createdAt")
     VALUES ($1,$2,$3,'toolResult',$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
      row.chatId,
      row.runId,
      JSON.stringify(row.content),
      row.toolCallId,
      row.toolName,
      JSON.stringify(row.details),
      row.isError,
      row.createdAt
    ]
  )
}

describe('sourcesOfRows', () => {
  it('takes every result of a search, with the extract the model read', () => {
    const chatId = randomUUID()
    const runId = randomUUID()
    const rows = sourcesOfRows([
      toolRow(chatId, runId, {
        toolName: 'web_search',
        toolCallId: 'c1',
        details: [
          result(1, 'https://a.example/x'),
          result(2, 'https://b.example/y')
        ]
      })
    ])
    expect(rows.map((r) => [r.rank, r.link, r.toolCallId])).toEqual([
      [1, 'https://a.example/x', 'c1'],
      [2, 'https://b.example/y', 'c1']
    ])
    expect(rows[0]).toMatchObject({
      chatId,
      runId,
      toolName: 'web_search',
      title: 'Title 1',
      content: 'Extract of 1',
      snippet: 'Snippet 1',
      hostname: 'a.example',
      siteName: 'Site',
      age: '2 days ago'
    })
  })

  // web_fetch's details keep a 600-character preview; the page the model
  // read is the result's text, and that is what a recall gives back.
  it('keeps a fetched page whole, from the result text', () => {
    const [row] = sourcesOfRows([
      toolRow(randomUUID(), randomUUID(), {
        toolName: 'web_fetch',
        details: result(7, 'https://c.example/page'),
        text: '[7] Page\nURL: https://c.example/page\n\nThe whole page.'
      })
    ])
    expect(row.rank).toBe(7)
    expect(row.content).toBe(
      '[7] Page\nURL: https://c.example/page\n\nThe whole page.'
    )
  })

  it('skips failed calls, other tools and a fetch that had no number', () => {
    const chatId = randomUUID()
    const runId = randomUUID()
    expect(
      sourcesOfRows([
        toolRow(chatId, runId, {
          toolName: 'web_search',
          details: [result(1, 'https://a.example/')],
          isError: true
        }),
        toolRow(chatId, runId, { toolName: 'weather', details: { rank: 3 } }),
        toolRow(chatId, runId, {
          toolName: 'web_fetch',
          details: { url: 'https://x.example', length: 10 }
        })
      ])
    ).toEqual([])
  })
})

describe('the chat_source table', () => {
  it('saves a run’s sources once, however often it is asked to', async () => {
    const chatId = await newChat()
    const rows = sourcesOfRows([
      toolRow(chatId, randomUUID(), {
        toolName: 'web_search',
        toolCallId: 'c1',
        details: [result(1, 'https://a.example/'), result(2, 'https://b/')]
      })
    ])
    await saveChatSources(rows)
    await saveChatSources(rows)
    expect(await listChatSources(chatId)).toHaveLength(2)
    expect(await highestSourceRank(chatId)).toBe(2)
  })

  it('answers 0 for a chat that never searched', async () => {
    expect(await highestSourceRank(await newChat())).toBe(0)
  })

  // A chat older than the table, or one restored by an import: its sources
  // are read out of its stored messages the first time they are needed.
  it('fills in an older chat’s sources from its messages', async () => {
    const chatId = await newChat()
    const runId = randomUUID()
    await insertRow(
      toolRow(chatId, runId, {
        toolName: 'web_search',
        details: [result(4, 'https://a.example/'), result(5, 'https://b/')]
      })
    )
    await insertRow(
      toolRow(chatId, runId, {
        toolName: 'web_fetch',
        details: result(6, 'https://c.example/'),
        text: 'the page'
      })
    )
    await ensureChatSources(chatId)
    expect(await highestSourceRank(chatId)).toBe(6)
    expect((await getChatSource(chatId, 6))?.content).toBe('the page')
  })

  // Before 2026-09-29 every run numbered its sources from 1: a rank names
  // the newest source that carries it, as the clients resolved it.
  it('resolves a repeated rank to the newest source', async () => {
    const chatId = await newChat()
    await insertRow(
      toolRow(chatId, randomUUID(), {
        toolName: 'web_search',
        details: [result(1, 'https://old.example/')]
      })
    )
    await insertRow(
      toolRow(chatId, randomUUID(), {
        toolName: 'web_search',
        details: [result(1, 'https://new.example/')]
      })
    )
    expect((await getChatSource(chatId, 1))?.link).toBe('https://new.example/')
    expect(await getChatSource(chatId, 2)).toBeNull()
  })
})
