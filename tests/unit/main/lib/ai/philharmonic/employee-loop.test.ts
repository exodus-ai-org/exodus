import { describe, expect, it, vi } from 'vitest'

const agentLoopMock = vi.fn()
vi.mock('@mariozechner/pi-agent-core', () => ({
  agentLoop: (...args: unknown[]) => agentLoopMock(...args)
}))
vi.mock('@mariozechner/pi-ai', () => ({}))
vi.mock('@main/lib/db/queries', () => ({
  getSettings: async () => ({ id: 's' })
}))
vi.mock('@main/lib/ai/utils/chat-message-util', () => ({
  getModelFromProvider: () => ({
    chatModel: { cost: { input: 1, output: 2 } },
    apiKey: 'k'
  }),
  bindCallingTools: () => []
}))
vi.mock('@main/lib/ai/mcp', () => ({
  getMcpTools: async () => [],
  getMcpToolsByNames: async () => []
}))
vi.mock('@main/lib/db/team-queries', () => ({ getTeamById: async () => null }))
vi.mock('@main/lib/ai/skills/skills-manager', () => ({
  getActiveSkillsContent: async () => '',
  getSkillsContentBySlugs: async () => 'SKILL-X'
}))
const updateTaskExecution = vi.fn()
vi.mock('@main/lib/db/philharmonic-queries', () => ({
  updateTaskExecution,
  createTaskExecutionEvent: vi.fn(),
  getAgentMemories: async () => []
}))

const { runEmployeeLoop } =
  await import('@main/lib/ai/philharmonic/employee-loop')

function fakeStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e
    }
  }
}

describe('runEmployeeLoop', () => {
  it('uses the agent skills (not a department) and captures usage', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'done' }],
            usage: { input: 100, output: 50 }
          }
        }
      ])
    )
    const emit = vi.fn()
    const out = await runEmployeeLoop({
      agent: {
        id: 'a',
        name: 'Avery',
        skillSlugs: ['x'],
        mcpServerNames: [],
        toolAllowList: []
      } as never,
      instructions: 'do it',
      executionId: 'e1',
      conversationId: 'c1',
      emit
    })
    expect(out).toBe('done')
    // usage written to execution
    expect(updateTaskExecution).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        tokenUsage: expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50
        })
      })
    )
    // streamed a message_end conversation event
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message_end', conversationId: 'c1' })
    )
  })

  it('throws on stopReason error (no silent empty message)', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [],
            stopReason: 'error',
            errorMessage: 'boom'
          }
        }
      ])
    )
    await expect(
      runEmployeeLoop({
        agent: {
          id: 'a',
          name: 'A',
          skillSlugs: [],
          mcpServerNames: [],
          toolAllowList: []
        } as never,
        instructions: 'x',
        executionId: 'e',
        conversationId: 'c',
        emit: vi.fn()
      })
    ).rejects.toThrow('boom')
  })
})
