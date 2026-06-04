import { describe, expect, it, vi } from 'vitest'

const agentLoopMock = vi.fn()
vi.mock('@mariozechner/pi-agent-core', () => ({
  agentLoop: (...a: unknown[]) => agentLoopMock(...a)
}))
vi.mock('@mariozechner/pi-ai', () => ({
  Type: {
    Object: (o: unknown) => o,
    String: (o?: unknown) => o ?? {},
    Array: (_t: unknown, o?: unknown) => o ?? {}
  }
}))
vi.mock('../../db/queries', () => ({ getSettings: async () => ({ id: 's' }) }))
vi.mock('../utils/chat-message-util', () => ({
  getModelFromProvider: () => ({ chatModel: {}, apiKey: 'k' })
}))
// Mock execution-engine to avoid transitive mcp/electron imports
vi.mock('./execution-engine', () => ({
  runDelegatedTask: vi.fn(async () => 'delegated result')
}))
// Mock recruit to avoid transitive pi-ai/queries imports
vi.mock('./recruit', () => ({
  autoCreateEmployee: vi.fn(async () => ({ id: 'a2', name: 'Quinn' }))
}))
// Mock kb-tools to avoid transitive knowledge-queries imports
vi.mock('./kb-tools', () => ({
  createSearchKnowledgeBaseTool: vi.fn((_allowedTeamIds: string[]) => ({
    name: 'searchKnowledgeBase',
    label: 'Search',
    description: 'Search',
    parameters: {},
    execute: vi.fn()
  }))
}))
// Mock team-scope so PM doesn't pull in conversation/agent queries during tests
vi.mock('./team-scope', () => ({
  computeAllowedTeamIds: vi.fn(async () => [])
}))
// Mock ask-user-registry
vi.mock('./ask-user-registry', () => ({
  askUserRegistry: { wait: vi.fn(), has: vi.fn(), resolve: vi.fn() }
}))
const getActiveAgents = vi.fn(async () => [
  { id: 'a1', name: 'Avery', description: 'Analyst', isActive: true }
])
const createConversationMessage = vi.fn(async (d) => ({ id: 'm', ...d }))
const getMessagesByConversationId = vi.fn(async () => [])
vi.mock('../../db/philharmonic-queries', () => ({
  getActiveAgents,
  createTask: vi.fn(async (d) => ({ id: 't1', ...d }))
}))
vi.mock('../../db/team-queries', () => ({ getAllTeams: async () => [] }))
vi.mock('../../db/conversation-queries', () => ({
  createConversationMessage,
  getMessagesByConversationId,
  addMemberToConversation: vi.fn(async () => ({ memberAgentIds: ['a1'] }))
}))
// Plan tables aren't touched by the smoke test (the LLM stream we feed in
// doesn't call any plan tool); these stubs short-circuit DB access.
vi.mock('../../db/plan-queries', () => ({
  appendStepToPlan: vi.fn(),
  createPlanWithSteps: vi.fn(),
  getActivePlanByConversationId: vi.fn(async () => null),
  updatePlanStatus: vi.fn(),
  updateStep: vi.fn()
}))
vi.mock('./plan-mirror', () => ({
  writePlanMirror: vi.fn(async () => '/tmp/plan.md')
}))

function fakeStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e
    }
  }
}

const { runPmCoordinator } = await import('./pm-coordinator')

describe('runPmCoordinator', () => {
  it('persists the PM final message and emits bubbles', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'All done — report ready.' }],
            usage: { input: 10, output: 5 }
          }
        }
      ])
    )
    const emit = vi.fn()
    await runPmCoordinator({
      conversationId: 'c1',
      userText: 'build a report',
      emit
    })
    expect(createConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        role: 'pm',
        content: expect.stringContaining('report')
      })
    )
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message_start', role: 'pm' })
    )
  })
})
