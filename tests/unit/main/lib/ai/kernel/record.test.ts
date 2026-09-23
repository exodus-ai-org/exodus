import type { ChatAssistantMessage } from '@exodus/shared/types/chat'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false }
}))
const saveMessages = vi.fn(async () => undefined)
vi.mock('@main/lib/db/queries', () => ({ saveMessages }))
const enqueueAndProcess = vi.fn(async () => undefined)
vi.mock('@main/lib/jobs/worker', () => ({
  enqueueAndProcess,
  logEnqueueFailure: vi.fn()
}))

const { RunRecorder } = await import('@main/lib/ai/kernel/record')

const RUN_ID = '11111111-1111-4111-8111-111111111111'
const model = { id: 'm', provider: 'faux' } as never

function recorder(
  over: Partial<ConstructorParameters<typeof RunRecorder>[0]> = {}
) {
  return new RunRecorder({
    chatId: 'c',
    model,
    apiKey: 'k',
    lcm: { freshTailRuns: 6, contextWindowPercent: 75 },
    memoryCapture: true,
    indexMessage: vi.fn(),
    priorMessages: [
      { id: RUN_ID, runId: RUN_ID, role: 'user', content: 'hi', timestamp: 1 }
    ],
    ...over
  })
}

const assistant: ChatAssistantMessage = {
  id: 'a1',
  runId: RUN_ID,
  role: 'assistant',
  content: [{ type: 'text', text: 'x' }],
  api: 'a',
  provider: 'p',
  model: 'm',
  usage: {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 2,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  },
  stopReason: 'stop',
  timestamp: 2
}

beforeEach(() => {
  saveMessages.mockClear()
  enqueueAndProcess.mockClear()
})

describe('RunRecorder', () => {
  it('persists the run_end messages with durationMs on the last assistant message and enqueues the jobs', async () => {
    const indexMessage = vi.fn()
    const r = recorder({ indexMessage })
    r.observe({
      type: 'run_end',
      runId: RUN_ID,
      messages: [assistant],
      durationMs: 1234
    })
    await r.persist()

    expect(saveMessages).toHaveBeenCalledTimes(1)
    const rows = (
      saveMessages.mock.calls[0] as unknown as [
        { messages: Array<Record<string, unknown>> }
      ]
    )[0].messages
    expect(rows[0]).toMatchObject({ id: 'a1', runId: RUN_ID, durationMs: 1234 })
    expect(indexMessage).toHaveBeenCalledWith(rows[0])
    expect(enqueueAndProcess).toHaveBeenCalledWith(
      'lcm-post-turn',
      expect.objectContaining({
        chatId: 'c',
        freshTailRuns: 6,
        newMessages: [{ id: 'a1', content: assistant.content }]
      })
    )
    expect(enqueueAndProcess).toHaveBeenCalledWith(
      'memory-consolidate',
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: assistant.content }
        ]
      })
    )
  })

  it('keeps the rows of a run in order even when two share a millisecond', async () => {
    // A tool result is stamped at tool_end and the next step at its stream
    // start — the same ms is common. Rows are read back ORDER BY createdAt,
    // so equal stamps would leave the order to the database.
    const call = { ...assistant, id: 'a1', timestamp: 1000 }
    const result = {
      id: 't1',
      runId: RUN_ID,
      role: 'toolResult' as const,
      toolCallId: 'c1',
      toolName: 'weather',
      content: [],
      details: null,
      isError: false,
      timestamp: 1000
    }
    const answer = { ...assistant, id: 'a2', timestamp: 1000 }
    const r = recorder()
    r.observe({
      type: 'run_end',
      runId: RUN_ID,
      messages: [call, result, answer],
      durationMs: 1
    })
    await r.persist()
    const rows = (
      saveMessages.mock.calls[0] as unknown as [
        { messages: Array<{ createdAt: Date }> }
      ]
    )[0].messages
    const stamps = rows.map((row) => row.createdAt.getTime())
    expect(stamps).toEqual([1000, 1001, 1002])
  })

  it('persists nothing when the run produced nothing', async () => {
    const r = recorder()
    r.observe({ type: 'run_end', runId: RUN_ID, messages: [], durationMs: 5 })
    await r.persist()
    expect(saveMessages).not.toHaveBeenCalled()
    expect(enqueueAndProcess).not.toHaveBeenCalled()
  })

  it('persists nothing when run_end never arrived', async () => {
    const r = recorder()
    r.observe({ type: 'message_end', runId: RUN_ID, message: assistant })
    await r.persist()
    expect(saveMessages).not.toHaveBeenCalled()
  })

  it('persist is idempotent', async () => {
    const r = recorder()
    r.observe({
      type: 'run_end',
      runId: RUN_ID,
      messages: [assistant],
      durationMs: 1
    })
    await r.persist()
    await r.persist()
    expect(saveMessages).toHaveBeenCalledTimes(1)
  })

  it('skips LCM and memory jobs when they are off', async () => {
    const r = recorder({ lcm: null, memoryCapture: false })
    r.observe({
      type: 'run_end',
      runId: RUN_ID,
      messages: [assistant],
      durationMs: 1
    })
    await r.persist()
    expect(saveMessages).toHaveBeenCalledTimes(1)
    expect(enqueueAndProcess).not.toHaveBeenCalled()
  })

  it('exposes the run messages after run_end', () => {
    const r = recorder()
    expect(r.messages).toEqual([])
    r.observe({
      type: 'run_end',
      runId: RUN_ID,
      messages: [assistant],
      durationMs: 1
    })
    expect(r.messages).toEqual([assistant])
  })
})
