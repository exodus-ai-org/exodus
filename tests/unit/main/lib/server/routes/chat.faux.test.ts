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
const { registerFauxProvider } = await import('@main/lib/ai/kernel/faux')

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
})
