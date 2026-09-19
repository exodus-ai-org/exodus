// src/main/lib/server/routes/chat.ts
//
// No pre-existing unit test for this route was found (only chat-errors.test.ts,
// which covers chat.ts's pure helper exports, not the POST '/' handler itself —
// the route's end-to-end behavior is otherwise only exercised by the Playwright
// suite in tests/api/v1/chat-*.spec.ts). This file mocks the route's collaborators
// the same way tests/unit/main/lib/ai/philharmonic/employee-loop.test.ts mocks
// agentLoop + getModelFromProvider for a structurally similar agentLoop caller,
// and tests/unit/main/lib/server/middlewares/trace.test.ts's pattern of wrapping
// a route in a bare Hono app and driving it with app.request().
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))

const agentLoopMock = vi.fn()
vi.mock('@mariozechner/pi-agent-core', () => ({
  agentLoop: (...args: unknown[]) => agentLoopMock(...args)
}))
vi.mock('@mariozechner/pi-ai', () => ({}))

vi.mock('@main/lib/ai/context-management', () => ({
  LcmManager: class {
    trackNewMessages = vi.fn(async () => {})
    assembleContext = vi.fn(async () => ({ messages: [] }))
    compactAfterTurn = vi.fn(async () => {})
  }
}))

vi.mock('@main/lib/ai/mcp', () => ({
  getMcpTools: vi.fn(async () => [])
}))

vi.mock('@main/lib/ai/memory/manager', () => ({
  loadRelevantMemories: vi.fn(async () => []),
  formatMemoriesForSystem: vi.fn(() => '')
}))

vi.mock('@main/lib/ai/prompts', () => ({
  buildPersonalityPrompt: vi.fn(() => ''),
  deepResearchBootPrompt: 'DEEP_RESEARCH_BOOT',
  getSystemPrompt: vi.fn(() => 'SYSTEM')
}))

vi.mock('@main/lib/ai/skills/skills-manager', () => ({
  getActiveSkillsContent: vi.fn(async () => '')
}))

const getModelFromProviderMock = vi.fn()
const bindCallingToolsMock = vi.fn(() => [])
vi.mock('@main/lib/ai/utils/chat-message-util', () => ({
  bindCallingTools: (...args: unknown[]) => bindCallingToolsMock(...args),
  generateTitleFromUserMessage: vi.fn(async () => 'A title'),
  getModelFromProvider: (...args: unknown[]) =>
    getModelFromProviderMock(...args),
  getTextFromMessage: vi.fn((m: { content: unknown }) =>
    typeof m.content === 'string' ? m.content : ''
  )
}))

vi.mock('@main/lib/ai/utils/cost', () => ({
  calculateCost: vi.fn(() => ({ total: 0 }))
}))

vi.mock('@main/lib/ai/utils/transform-messages', () => ({
  transformMessages: vi.fn((m: unknown) => m)
}))

vi.mock('@main/lib/db/project-queries', () => ({
  getProjectById: vi.fn(async () => null),
  bumpProjectUpdatedAt: vi.fn(async () => {})
}))

vi.mock('@main/lib/db/queries', () => ({
  deleteChatById: vi.fn(async () => {}),
  getChatById: vi.fn(async () => null),
  getMessagesByChatId: vi.fn(async () => []),
  saveChat: vi.fn(async () => {}),
  saveMessages: vi.fn(async () => {}),
  updateChat: vi.fn(async () => {}),
  updateChatTitleById: vi.fn(async () => {})
}))

const enqueueAndProcessMock = vi.fn(async () => {})
vi.mock('@main/lib/jobs/worker', () => ({
  enqueueAndProcess: (...args: unknown[]) => enqueueAndProcessMock(...args),
  logEnqueueFailure: vi.fn()
}))

vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

vi.mock('@main/lib/logger/trace-context', () => ({
  bindTraceAttributes: vi.fn()
}))

vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: vi.fn(() => ({ elasticsearch: null, pglite: {} })),
  searchWithFallback: vi.fn(async () => [])
}))

const { default: chat } = await import('@main/lib/server/routes/chat')
const { saveMessages } = await import('@main/lib/db/queries')
const { resolveSearchProvider } =
  await import('@main/lib/search/resolve-search-provider')
const saveMessagesMock = vi.mocked(saveMessages)
const resolveSearchProviderMock = vi.mocked(resolveSearchProvider)

const FAKE_MODEL = { id: 'fake-model', cost: { input: 1, output: 2 } }
const CHAT_ID = '11111111-1111-4111-8111-111111111111'

function buildApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('settings', {
      id: 'settings-1',
      memory: { lcmEnabled: true, autoCapture: true, useInChat: true }
    } as never)
    await next()
  })
  app.route('/', chat)
  return app
}

function fakeAgentStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e
    }
  }
}

function successfulTurn() {
  return fakeAgentStream([
    {
      type: 'message_end',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello world' }],
        usage: { input: 1, output: 1, totalTokens: 2 },
        api: 'anthropic-messages',
        provider: 'anthropic',
        model: 'claude-x',
        stopReason: 'stop',
        timestamp: Date.now()
      }
    }
  ])
}

function assistantEnd(overrides: Record<string, unknown>) {
  return {
    type: 'message_end',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'partial answer' }],
      usage: { input: 1, output: 1, totalTokens: 2 },
      api: 'anthropic-messages',
      provider: 'anthropic',
      model: 'claude-x',
      stopReason: 'stop',
      timestamp: Date.now(),
      ...overrides
    }
  }
}

/** Rows handed to saveMessages for the assistant side of the turn. */
function savedAssistantRows() {
  return saveMessagesMock.mock.calls
    .flatMap(([arg]) => arg.messages)
    .filter((row) => row.role === 'assistant')
}

function sseEvents(body: string): Array<{ type: string }> {
  return body
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice(6)))
}

function postChat(body: Record<string, unknown>) {
  const app = buildApp()
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: CHAT_ID,
      messages: [{ id: 'u1', role: 'user', content: 'hi' }],
      advancedTools: [],
      ...body
    })
  })
}

describe('POST /api/v1/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getModelFromProviderMock.mockReturnValue({
      model: FAKE_MODEL,
      apiKey: 'test-key'
    })
    agentLoopMock.mockReturnValue(successfulTurn())
  })

  it('passes reasoningEffort through to agentLoop as the reasoning option', async () => {
    const response = await postChat({ reasoningEffort: 'high' })
    await response.text() // drain the SSE stream so start() finishes

    expect(agentLoopMock).toHaveBeenCalledTimes(1)
    const options = agentLoopMock.mock.calls[0][2]
    expect(options).toMatchObject({
      model: FAKE_MODEL,
      apiKey: 'test-key',
      reasoning: 'high'
    })
  })

  it('omits reasoning when reasoningEffort is "off"', async () => {
    const response = await postChat({ reasoningEffort: 'off' })
    await response.text()

    const options = agentLoopMock.mock.calls[0][2]
    expect(options.reasoning).toBeUndefined()
  })

  it('omits reasoning when reasoningEffort is absent', async () => {
    const response = await postChat({})
    await response.text()

    const options = agentLoopMock.mock.calls[0][2]
    expect(options.reasoning).toBeUndefined()
  })

  it('maps reasoningEffort "max" down to "xhigh" (pi-agent-core has no "max" ThinkingLevel)', async () => {
    const response = await postChat({ reasoningEffort: 'max' })
    await response.text()

    const options = agentLoopMock.mock.calls[0][2]
    expect(options.reasoning).toBe('xhigh')
  })

  it('forces reasoning "high" for Deep Research regardless of reasoningEffort', async () => {
    const response = await postChat({
      advancedTools: ['Deep Research'],
      reasoningEffort: 'off'
    })
    await response.text()

    const options = agentLoopMock.mock.calls[0][2]
    expect(options.reasoning).toBe('high')
  })

  it('enqueues lcm-post-turn and memory-consolidate payloads with the renamed model field', async () => {
    const response = await postChat({ reasoningEffort: 'low' })
    await response.text()

    const lcmCall = enqueueAndProcessMock.mock.calls.find(
      (c) => c[0] === 'lcm-post-turn'
    )
    const memoryCall = enqueueAndProcessMock.mock.calls.find(
      (c) => c[0] === 'memory-consolidate'
    )
    expect(lcmCall?.[1]).toMatchObject({
      model: FAKE_MODEL,
      apiKey: 'test-key'
    })
    expect(lcmCall?.[1]).not.toHaveProperty('chatModel')
    expect(memoryCall?.[1]).toMatchObject({
      model: FAKE_MODEL,
      apiKey: 'test-key'
    })
    expect(memoryCall?.[1]).not.toHaveProperty('chatModel')
  })

  describe('index-message job', () => {
    it('is not enqueued when Elasticsearch is not configured', async () => {
      const response = await postChat({})
      await response.text()

      const queues = enqueueAndProcessMock.mock.calls.map((c) => c[0])
      expect(queues).not.toContain('index-message')
    })

    it('is enqueued for the user message and each new message when Elasticsearch is configured', async () => {
      resolveSearchProviderMock.mockReturnValue({
        elasticsearch: {},
        pglite: {}
      } as never)

      const response = await postChat({})
      await response.text()

      const indexed = enqueueAndProcessMock.mock.calls.filter(
        (c) => c[0] === 'index-message'
      )
      expect(indexed.map((c) => (c[1] as { role: string }).role)).toEqual([
        'user',
        'assistant'
      ])
      resolveSearchProviderMock.mockReturnValue({
        elasticsearch: null,
        pglite: {}
      } as never)
    })
  })

  describe('saving the turn', () => {
    it('saves the steps that finished when a later step fails, and still reports the error', async () => {
      agentLoopMock.mockReturnValue(
        fakeAgentStream([
          assistantEnd({ content: [{ type: 'text', text: 'step one' }] }),
          assistantEnd({ stopReason: 'error', errorMessage: 'provider 500' })
        ])
      )

      const response = await postChat({})
      const events = sseEvents(await response.text())

      expect(events.map((e) => e.type)).toContain('error')
      const rows = savedAssistantRows()
      expect(rows).toHaveLength(1)
      expect(JSON.stringify(rows[0].content)).toContain('step one')
      // LCM must learn about what was saved, or its context drifts from the DB.
      expect(
        enqueueAndProcessMock.mock.calls.some((c) => c[0] === 'lcm-post-turn')
      ).toBe(true)
    })

    it('keeps the partial answer of a stopped turn', async () => {
      agentLoopMock.mockReturnValue(
        fakeAgentStream([assistantEnd({ stopReason: 'aborted' })])
      )

      const response = await postChat({})
      const events = sseEvents(await response.text())

      expect(events.map((e) => e.type)).not.toContain('error')
      const rows = savedAssistantRows()
      expect(rows).toHaveLength(1)
      expect(JSON.stringify(rows[0].content)).toContain('partial answer')
    })

    it('treats a turn stopped before the first token as nothing to save, not an error', async () => {
      agentLoopMock.mockReturnValue(
        fakeAgentStream([
          assistantEnd({
            stopReason: 'aborted',
            content: [],
            usage: { input: 0, output: 0, totalTokens: 0 }
          })
        ])
      )

      const response = await postChat({})
      const events = sseEvents(await response.text())

      expect(events.map((e) => e.type)).not.toContain('error')
      expect(savedAssistantRows()).toHaveLength(0)
    })

    it('still saves the turn when the client has hung up (Stop cancels the response stream)', async () => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      agentLoopMock.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'message_update',
            message: assistantEnd({ stopReason: 'pending' }).message
          }
          await gate
          yield assistantEnd({ stopReason: 'aborted' })
        }
      })

      const response = await postChat({})
      const reader = response.body!.getReader()
      await reader.read() // first frame arrived — the turn is streaming
      await reader.cancel()
      release()

      await vi.waitFor(() => expect(savedAssistantRows()).toHaveLength(1))
    })
  })
})
