// The chat route through the real kernel on pi's faux provider: a send that
// runs a tool call and answers, as SSE, with every message stamped with the
// run's id and the rows persisted once. Collaborators that reach the database,
// the job queue or the network are mocked; the kernel is not.
import type { AgentTool } from '@earendil-works/pi-agent-core'
import {
  Type,
  fauxAssistantMessage,
  fauxText,
  fauxToolCall
} from '@earendil-works/pi-ai'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false }
}))

vi.mock('@main/lib/ai/context-management', () => ({
  freshTailRuns: () => 6,
  LcmManager: class {
    trackNewMessages = vi.fn(async () => {})
    assembleContext = vi.fn(async () => ({ messages: [] }))
    compactAfterTurn = vi.fn(async () => {})
  }
}))
vi.mock('@main/lib/ai/mcp', () => ({ getMcpTools: vi.fn(async () => []) }))
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
  getActiveSkillsIndex: vi.fn(async () => '')
}))

const weather: AgentTool = {
  name: 'weather',
  label: 'Weather',
  description: 'test',
  parameters: Type.Object({ location: Type.String() }),
  execute: async (_id, { location }) => ({
    content: [{ type: 'text', text: `sunny in ${location}` }],
    details: { location }
  })
}
const getModelFromProviderMock = vi.fn()
vi.mock('@main/lib/ai/utils/chat-message-util', () => ({
  bindCallingTools: () => [weather],
  generateTitleFromUserMessage: vi.fn(async () => 'A title'),
  getModelFromProvider: (...args: unknown[]) =>
    getModelFromProviderMock(...args),
  getTextFromMessage: vi.fn((m: { content: unknown }) =>
    typeof m.content === 'string' ? m.content : ''
  )
}))
vi.mock('@main/lib/db/project-queries', () => ({
  getProjectById: vi.fn(async () => null),
  bumpProjectUpdatedAt: vi.fn(async () => {})
}))
const saveMessages = vi.fn(async () => {})
vi.mock('@main/lib/db/queries', () => ({
  deleteChatById: vi.fn(async () => {}),
  getChatById: vi.fn(async () => ({ id: 'existing' })),
  getMessagesByChatId: vi.fn(async () => []),
  saveChat: vi.fn(async () => {}),
  saveMessages: (...args: unknown[]) => saveMessages(...(args as [])),
  updateChat: vi.fn(async () => {}),
  updateChatTitleById: vi.fn(async () => {})
}))
vi.mock('@main/lib/jobs/worker', () => ({
  enqueueAndProcess: vi.fn(async () => {}),
  logEnqueueFailure: vi.fn()
}))
vi.mock('@main/lib/logger/trace-context', () => ({
  bindTraceAttributes: vi.fn()
}))
vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: vi.fn(() => ({ elasticsearch: null, pglite: {} })),
  searchWithFallback: vi.fn(async () => [])
}))

const { default: chat } = await import('@main/lib/server/routes/chat')
const { enqueueAndProcess } = await import('@main/lib/jobs/worker')
const { SETTINGS_SECRET_PATHS } = await import('@main/lib/secrets/registry')
const { registerFauxProvider } = await import('@main/lib/ai/kernel/faux')
const { loadRelevantMemories } = await import('@main/lib/ai/memory/manager')

const CHAT_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'

function buildApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('settings', {
      id: 'settings-1',
      memory: { lcmEnabled: true, autoCapture: true, useInChat: false }
    } as never)
    await next()
  })
  app.route('/', chat)
  return app
}

/** Same as `buildApp()`, but with "use memory in chat" on — for the
 *  `memories_used` SSE event tests, which need `loadRelevantMemories` to
 *  actually be called. */
function buildAppMemoryOn() {
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

function sseEvents(
  body: string
): Array<Record<string, unknown> & { type: string }> {
  return body
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice(6)))
}

beforeEach(() => {
  saveMessages.mockClear()
  vi.mocked(loadRelevantMemories).mockReset().mockResolvedValue([])
})

describe('POST /api/v1/chat on the faux provider', () => {
  it('streams a tool run as SSE, every message stamped with the run id, and persists once', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall('weather', { location: 'Oslo' }, { id: 'call_1' })],
        { stopReason: 'toolUse' }
      ),
      fauxAssistantMessage([fauxText('Sunny.')])
    ])
    getModelFromProviderMock.mockReturnValue({
      model: faux.getModel(),
      apiKey: 'k'
    })

    const response = await buildApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: CHAT_ID,
        messages: [
          {
            id: USER_ID,
            role: 'user',
            content: 'weather in Oslo',
            timestamp: 1
          }
        ],
        advancedTools: []
      })
    })
    const events = sseEvents(await response.text())

    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining([
        'message_update',
        'tool_call_start',
        'tool_call_end',
        'done'
      ])
    )
    expect(events.some((e) => e.type === 'error')).toBe(false)

    const done = events.find((e) => e.type === 'done') as {
      messages: Array<{ role: string; runId: string; content: unknown }>
    }
    expect(done.messages.map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'toolResult',
      'assistant'
    ])
    expect(done.messages.every((m) => m.runId === USER_ID)).toBe(true)
    expect(done.messages[2].content).toEqual([
      { type: 'text', text: 'sunny in Oslo' }
    ])
    expect(done.messages[3].content).toEqual([{ type: 'text', text: 'Sunny.' }])

    // The user row, then the run's three rows, each with the run id.
    expect(saveMessages).toHaveBeenCalledTimes(2)
    const runRows = (
      saveMessages.mock.calls[1] as unknown as [
        { messages: Array<{ runId: string; role: string }> }
      ]
    )[0].messages
    expect(runRows.map((r) => r.role)).toEqual([
      'assistant',
      'toolResult',
      'assistant'
    ])
    expect(runRows.every((r) => r.runId === USER_ID)).toBe(true)
  })

  it('sends memories_used as the first SSE event, stamped with the run id, when the read filter selected a memory', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('Sunny.')])])
    getModelFromProviderMock.mockReturnValue({
      model: faux.getModel(),
      apiKey: 'k'
    })
    vi.mocked(loadRelevantMemories).mockResolvedValue([
      { id: 'mem-1', key: 'Classical Music', section: 'topic' } as never
    ])

    const response = await buildAppMemoryOn().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: CHAT_ID,
        messages: [{ id: USER_ID, role: 'user', content: 'hi', timestamp: 1 }],
        advancedTools: []
      })
    })
    const events = sseEvents(await response.text())

    expect(events[0]).toEqual({
      type: 'memories_used',
      runId: USER_ID,
      memories: [{ id: 'mem-1', key: 'Classical Music', section: 'topic' }]
    })
  })

  it('in Deep Research mode runs no read filter and sends no memories_used — its prompt carries no memories', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('Researching.')])])
    getModelFromProviderMock.mockReturnValue({
      model: faux.getModel(),
      apiKey: 'k'
    })
    vi.mocked(loadRelevantMemories).mockResolvedValue([
      { id: 'mem-1', key: 'Classical Music', section: 'topic' } as never
    ])

    const response = await buildAppMemoryOn().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: CHAT_ID,
        messages: [{ id: USER_ID, role: 'user', content: 'hi', timestamp: 1 }],
        advancedTools: ['Deep Research']
      })
    })
    const events = sseEvents(await response.text())

    // No read filter means no usage-log rows and no lastUsedAt bump either —
    // those happen inside loadRelevantMemories.
    expect(loadRelevantMemories).not.toHaveBeenCalled()
    expect(events.some((e) => e.type === 'memories_used')).toBe(false)
  })

  it('sends no memories_used event when the read filter selected nothing', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('Sunny.')])])
    getModelFromProviderMock.mockReturnValue({
      model: faux.getModel(),
      apiKey: 'k'
    })
    vi.mocked(loadRelevantMemories).mockResolvedValue([])

    const response = await buildAppMemoryOn().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: CHAT_ID,
        messages: [{ id: USER_ID, role: 'user', content: 'hi', timestamp: 1 }],
        advancedTools: []
      })
    })
    const events = sseEvents(await response.text())

    expect(events.some((e) => e.type === 'memories_used')).toBe(false)
  })

  // Ledger ruling R3: pgmq rows live in PGlite (and a job given up on is
  // archived until the next launch), so a job payload must carry no key —
  // the handler reads it from settings when it runs.
  it('enqueues post-run jobs whose payloads carry no registry secret', async () => {
    const faux = registerFauxProvider()
    faux.setResponses([fauxAssistantMessage([fauxText('Hi.')])])
    const secret = (path: string) => `sk-${path}-DO-NOT-QUEUE-0000`
    const settings: Record<string, unknown> = {
      id: 'settings-1',
      memory: { lcmEnabled: true, autoCapture: true, useInChat: false }
    }
    for (const path of SETTINGS_SECRET_PATHS) {
      const keys = path.split('.')
      let o = settings
      for (const k of keys.slice(0, -1)) o = (o[k] ??= {}) as typeof o
      o[keys.at(-1)!] = secret(path)
    }
    getModelFromProviderMock.mockReturnValue({
      model: faux.getModel(),
      apiKey: secret('providers.openaiApiKey')
    })
    vi.mocked(enqueueAndProcess).mockClear()

    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('settings', settings as never)
      await next()
    })
    app.route('/', chat)
    const response = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: CHAT_ID,
        messages: [{ id: USER_ID, role: 'user', content: 'hi', timestamp: 1 }],
        advancedTools: []
      })
    })
    await response.text()

    const calls = vi.mocked(enqueueAndProcess).mock.calls as unknown[][]
    expect(calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['lcm-post-turn', 'memory-consolidate'])
    )
    const queued = JSON.stringify(calls.map((c) => c[1]))
    expect(queued).not.toContain('apiKey')
    for (const path of SETTINGS_SECRET_PATHS) {
      expect(queued).not.toContain(secret(path))
    }
  })
})
