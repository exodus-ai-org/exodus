import type { DBMessage } from '@main/lib/db/schema'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/db', () => ({ db: {}, pglite: {} }))
const getMessagesByChatId = vi.fn()
vi.mock('@main/lib/db/queries', () => ({
  getMessagesByChatId: (...args: unknown[]) => getMessagesByChatId(...args)
}))

const { loadChatHistory, rowToChatMessage } =
  await import('@main/lib/chat/history')

const at = new Date('2026-10-01T08:00:00.000Z')
const base = {
  chatId: 'c1',
  runId: 'u1',
  createdAt: at,
  usage: null,
  api: null,
  provider: null,
  model: null,
  stopReason: null,
  errorMessage: null,
  toolCallId: null,
  toolName: null,
  details: null,
  isError: null,
  durationMs: null,
  alternateOf: null,
  attempt: null,
  searchText: null
}
const row = (over: Partial<DBMessage>) => ({ ...base, ...over }) as DBMessage

const USAGE = {
  input: 1,
  output: 2,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 3,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
}

// The server owns the conversation now (spec 2026-10-01 §C1): what a client
// used to post back on every send is read from the database instead — so
// the rows must become the very messages the client would have sent.
describe('rowToChatMessage', () => {
  it('keeps a question with its regenerate state', () => {
    expect(
      rowToChatMessage(
        row({
          id: 'u1',
          role: 'user',
          content: 'hi',
          alternateOf: 'u0',
          attempt: 'comparing'
        })
      )
    ).toEqual({
      id: 'u1',
      runId: 'u1',
      role: 'user',
      content: 'hi',
      timestamp: at.getTime(),
      alternateOf: 'u0',
      attempt: 'comparing'
    })
  })

  it('keeps who wrote an answer, its usage and its duration', () => {
    expect(
      rowToChatMessage(
        row({
          id: 'a1',
          role: 'assistant',
          content: [{ type: 'text', text: 'yo' }],
          usage: USAGE,
          api: 'anthropic-messages',
          provider: 'anthropic',
          model: 'claude-x',
          stopReason: 'stop',
          durationMs: 1200
        })
      )
    ).toMatchObject({
      id: 'a1',
      runId: 'u1',
      role: 'assistant',
      usage: USAGE,
      api: 'anthropic-messages',
      provider: 'anthropic',
      model: 'claude-x',
      stopReason: 'stop',
      durationMs: 1200
    })
  })

  // pi reads `usage` off every assistant message of a request.
  it('gives an answer saved without usage a zero usage', () => {
    const m = rowToChatMessage(
      row({ id: 'a1', role: 'assistant', content: [], usage: null })
    )
    expect(m.role === 'assistant' && m.usage.totalTokens).toBe(0)
  })

  it('keeps a tool result whole, details and error flag included', () => {
    expect(
      rowToChatMessage(
        row({
          id: 't1',
          role: 'toolResult',
          content: [{ type: 'text', text: 'x' }],
          toolCallId: 'k1',
          toolName: 'web_search',
          details: [{ rank: 3 }],
          isError: false
        })
      )
    ).toEqual({
      id: 't1',
      runId: 'u1',
      role: 'toolResult',
      content: [{ type: 'text', text: 'x' }],
      toolCallId: 'k1',
      toolName: 'web_search',
      details: [{ rank: 3 }],
      isError: false,
      timestamp: at.getTime()
    })
  })
})

describe('loadChatHistory', () => {
  it('reads the chat in order and converts every row', async () => {
    getMessagesByChatId.mockResolvedValue([
      row({ id: 'u1', role: 'user', content: 'hi' }),
      row({ id: 'a1', role: 'assistant', content: [], usage: USAGE })
    ])
    const history = await loadChatHistory('c1')
    expect(getMessagesByChatId).toHaveBeenCalledWith({ id: 'c1' })
    expect(history.map((m) => m.id)).toEqual(['u1', 'a1'])
  })
})
