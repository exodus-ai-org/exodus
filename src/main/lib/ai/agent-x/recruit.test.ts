// src/main/lib/ai/agent-x/recruit.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@mariozechner/pi-ai', () => ({
  completeSimple: vi.fn(async () => ({
    content: [
      {
        type: 'text',
        text: '{"name":"","description":"Crunches numbers","systemPrompt":"You analyze data."}'
      }
    ]
  }))
}))
vi.mock('../../db/queries', () => ({ getSettings: async () => ({ id: 's' }) }))
vi.mock('../utils/chat-message-util', () => ({
  getModelFromProvider: () => ({ chatModel: {}, apiKey: 'k' })
}))
const createAgent = vi.fn(async (d) => ({ id: 'a1', ...d }))
const getAllAgents = vi.fn(async () => [{ name: 'Avery' }])
vi.mock('../../db/agent-x-queries', () => ({ createAgent, getAllAgents }))

const { autoCreateEmployee } = await import('./recruit')

describe('autoCreateEmployee', () => {
  it('fills a name from the pool when LLM returns none, and sets avatar seed', async () => {
    await autoCreateEmployee({
      role: 'Data analyst',
      skills: ['python']
    })
    expect(createAgent).toHaveBeenCalled()
    const arg = createAgent.mock.calls[0][0]
    expect(arg.name).toBeTruthy()
    expect(arg.name).not.toBe('Avery') // avoided the taken name
    expect(arg.avatarSeed).toMatch(/^[a-z0-9]+$/i)
    expect(arg.avatarStyle).toBeTruthy()
    expect(arg.isActive).toBe(true)
  })

  it('honors an explicit name', async () => {
    await autoCreateEmployee({ role: 'Writer', name: 'Pat' })
    const arg = createAgent.mock.calls.at(-1)![0]
    expect(arg.name).toBe('Pat')
  })
})
