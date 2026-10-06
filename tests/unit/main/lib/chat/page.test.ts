// A chat's history in pages (spec 2026-10-01 §C3) on a real, in-memory
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
const { compactRow, limitRow, loadChatPage, loadChatRow } =
  await import('@main/lib/chat/page')

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

async function insert(row: Record<string, unknown>) {
  const cols = Object.keys(row)
  await pglite.query(
    `INSERT INTO "message" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
    cols.map((c) =>
      ['content', 'details', 'usage'].includes(c)
        ? JSON.stringify(row[c])
        : row[c]
    )
  )
}

/** A run: its question and its answer; optionally a regenerate state. */
async function addRun(
  chatId: string,
  text: string,
  opts: { alternateOf?: string; attempt?: string } = {}
): Promise<string> {
  const runId = randomUUID()
  await insert({
    id: runId,
    chatId,
    runId,
    role: 'user',
    content: [{ type: 'text', text }],
    alternateOf: opts.alternateOf ?? null,
    attempt: opts.attempt ?? null,
    createdAt: tick()
  })
  await insert({
    id: randomUUID(),
    chatId,
    runId,
    role: 'assistant',
    content: [{ type: 'text', text: `answer to ${text}` }],
    createdAt: tick()
  })
  return runId
}

const questionsOf = (messages: { role: string; content: unknown }[]) =>
  messages
    .filter((m) => m.role === 'user')
    .map((m) => (m.content as { text: string }[])[0].text)

describe('loadChatPage', () => {
  it('opens on the newest runs, whole, and says where the older ones start', async () => {
    const chatId = await newChat()
    const runs: string[] = []
    for (let i = 1; i <= 5; i++) runs.push(await addRun(chatId, `q${i}`))
    const page = await loadChatPage(chatId, { runs: 2 })
    expect(questionsOf(page.messages)).toEqual(['q4', 'q5'])
    expect(page.messages).toHaveLength(4)
    expect(page.hasOlder).toBe(true)
    expect(page.olderCursor).toBe(runs[3])
  })

  it('pages back from a cursor until there is nothing older', async () => {
    const chatId = await newChat()
    const runs: string[] = []
    for (let i = 1; i <= 5; i++) runs.push(await addRun(chatId, `q${i}`))
    const older = await loadChatPage(chatId, { runs: 2, before: runs[3] })
    expect(questionsOf(older.messages)).toEqual(['q2', 'q3'])
    const oldest = await loadChatPage(chatId, {
      runs: 2,
      before: older.olderCursor!
    })
    expect(questionsOf(oldest.messages)).toEqual(['q1'])
    expect(oldest.hasOlder).toBe(false)
    expect(oldest.olderCursor).toBeNull()
  })

  it('loads everything from the cursor back through a run picked in the outline', async () => {
    const chatId = await newChat()
    const runs: string[] = []
    for (let i = 1; i <= 6; i++) runs.push(await addRun(chatId, `q${i}`))
    const page = await loadChatPage(chatId, {
      runs: 2,
      before: runs[4],
      through: runs[1]
    })
    expect(questionsOf(page.messages)).toEqual(['q2', 'q3', 'q4'])
    expect(page.olderCursor).toBe(runs[1])
  })

  // A regenerate group is drawn as one: a page never splits it.
  it('takes a regenerate group whole, even past the page size', async () => {
    const chatId = await newChat()
    await addRun(chatId, 'q1')
    const first = await addRun(chatId, 'q2', { attempt: 'folded' })
    await addRun(chatId, 'q2', { alternateOf: first, attempt: 'chosen' })
    await addRun(chatId, 'q3')
    const page = await loadChatPage(chatId, { runs: 2 })
    expect(questionsOf(page.messages)).toEqual(['q2', 'q2', 'q3'])
    expect(page.olderCursor).toBe(first)
  })

  it('lists every question of the chat, for the outline', async () => {
    const chatId = await newChat()
    for (let i = 1; i <= 3; i++) await addRun(chatId, `question ${i}`)
    const page = await loadChatPage(chatId, { runs: 1 })
    expect(page.questions.map((q) => q.text)).toEqual([
      'question 1',
      'question 2',
      'question 3'
    ])
  })

  it('carries every source of the chat, loaded or not', async () => {
    const chatId = await newChat()
    const runId = await addRun(chatId, 'search')
    await insert({
      id: randomUUID(),
      chatId,
      runId,
      role: 'toolResult',
      content: [{ type: 'text', text: 'dump' }],
      toolCallId: 'c1',
      toolName: 'web_search',
      details: [
        {
          rank: 1,
          link: 'https://a.example/',
          title: 'A',
          snippet: 's',
          content: 'long extract'
        }
      ],
      isError: false,
      createdAt: tick()
    })
    for (let i = 0; i < 3; i++) await addRun(chatId, `later ${i}`)
    const page = await loadChatPage(chatId, { runs: 1 })
    expect(page.sources).toEqual([
      expect.objectContaining({
        rank: 1,
        link: 'https://a.example/',
        title: 'A',
        snippet: 's',
        runId
      })
    ])
    expect(page.sources[0]).not.toHaveProperty('content')
  })

  it('refuses a cursor that is not a run of this chat', async () => {
    const chatId = await newChat()
    await addRun(chatId, 'q')
    await expect(
      loadChatPage(chatId, { runs: 2, before: randomUUID() })
    ).rejects.toMatchObject({ code: 'RUN_NOT_FOUND' })
  })
})

const row = (over: Record<string, unknown>) =>
  ({
    id: 'm',
    chatId: 'c',
    runId: 'r',
    role: 'toolResult',
    content: [{ type: 'text', text: 'payload as text' }],
    searchText: 'indexed',
    toolCallId: 'k',
    toolName: 'grep',
    details: { matches: 3 },
    isError: false,
    createdAt: new Date(0),
    ...over
  }) as never

// What no client reads is not sent (audit 2026-10-01); what one does is.
describe('compactRow', () => {
  it('drops a successful result’s text when its details carry the payload', () => {
    const out = compactRow(row({}))
    expect(out.content).toEqual([])
    expect(out.details).toEqual({ matches: 3 })
    expect(out).not.toHaveProperty('searchText')
    expect(out).not.toHaveProperty('chatId')
  })

  it('keeps a failed result’s text: it is the error shown', () => {
    expect(compactRow(row({ isError: true })).content).toEqual([
      { type: 'text', text: 'payload as text' }
    ])
  })

  it('keeps a result with no details, and computer use (its screenshot)', () => {
    expect(compactRow(row({ details: null })).content).toHaveLength(1)
    expect(compactRow(row({ toolName: 'computer_use' })).content).toHaveLength(
      1
    )
  })

  it('drops the extracts of search results; the cards show snippets', () => {
    const out = compactRow(
      row({
        toolName: 'web_search',
        details: [
          { rank: 1, link: 'l', title: 't', snippet: 's', content: 'x' }
        ]
      })
    )
    expect(out.details).toEqual([
      { rank: 1, link: 'l', title: 't', snippet: 's' }
    ])
  })

  it('drops an artifact call’s code; the card reads it from the result', () => {
    const out = compactRow(
      row({
        role: 'assistant',
        toolName: null,
        content: [
          { type: 'text', text: 'here' },
          {
            type: 'toolCall',
            id: 'a1',
            name: 'create_artifact',
            arguments: { title: 'Chart', code: '<div/>' }
          }
        ]
      })
    )
    expect(out.content).toEqual([
      { type: 'text', text: 'here' },
      {
        type: 'toolCall',
        id: 'a1',
        name: 'create_artifact',
        arguments: { title: 'Chart' }
      }
    ])
  })
})

// A page stays small however large one row is: a long terminal output, a
// big file, a pasted document. The row is sent cut and marked; the client
// reads it whole from `GET /api/v1/chat/:id/messages/:messageId`.
describe('limitRow', () => {
  it('leaves a row under 64 KB as it is', () => {
    const r = compactRow(row({ details: { stdout: 'x'.repeat(1000) } }))
    expect(limitRow(r)).toBe(r)
  })

  it('cuts the long strings of a larger row and marks it', () => {
    const r = compactRow(
      row({ details: { stdout: 'x'.repeat(200_000), exitCode: 0 } })
    )
    const out = limitRow(r)
    expect(out.truncated).toBe(true)
    const stdout = (out.details as { stdout: string }).stdout
    expect(stdout.length).toBeLessThan(20_000)
    expect((out.details as { exitCode: number }).exitCode).toBe(0)
    expect(JSON.stringify(out).length).toBeLessThan(64 * 1024)
  })
})

describe('loadChatRow', () => {
  it('reads one row of the chat whole', async () => {
    const chatId = await newChat()
    const runId = await addRun(chatId, 'q')
    const loaded = await loadChatRow(chatId, runId)
    expect(loaded.id).toBe(runId)
    expect(loaded).not.toHaveProperty('searchText')
  })

  it('404 for a message of another chat', async () => {
    const other = await newChat()
    const runId = await addRun(other, 'q')
    await expect(loadChatRow(await newChat(), runId)).rejects.toMatchObject({
      code: 'MESSAGE_NOT_FOUND'
    })
  })
})
