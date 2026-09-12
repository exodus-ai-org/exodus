import { postRequestBodySchema } from '@main/lib/server/schemas/chat'
import { describe, expect, it } from 'vitest'

const CHAT_ID = '11111111-1111-4111-8111-111111111111'

describe('postRequestBodySchema — message passthrough', () => {
  it('keeps toolResult fields (details, toolCallId, toolName, isError) on history messages', () => {
    const sources = [
      { title: 'A', url: 'https://a.example', snippet: 'a' },
      { title: 'B', url: 'https://b.example', snippet: 'b' }
    ]
    const parsed = postRequestBodySchema.parse({
      id: CHAT_ID,
      advancedTools: [],
      messages: [
        { id: 'u1', role: 'user', content: 'search please' },
        {
          id: 't1',
          role: 'toolResult',
          toolCallId: 'call_1',
          toolName: 'webSearch',
          content: [{ type: 'text', text: 'formatted citations' }],
          details: sources,
          isError: false
        },
        {
          id: 'a1',
          role: 'assistant',
          content: [{ type: 'text', text: 'hi' }]
        },
        { id: 'u2', role: 'user', content: 'now expand it' }
      ]
    })

    const tool = parsed.messages[1] as Record<string, unknown>
    expect(tool.details).toEqual(sources)
    expect(tool.toolCallId).toBe('call_1')
    expect(tool.toolName).toBe('webSearch')
    expect(tool.isError).toBe(false)
  })

  it('preserves assistant usage/model metadata on history messages', () => {
    const parsed = postRequestBodySchema.parse({
      id: CHAT_ID,
      advancedTools: [],
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: [{ type: 'text', text: 'answer' }],
          usage: { input: 10, output: 5, totalTokens: 15 },
          model: 'gpt-5'
        }
      ]
    })
    const msg = parsed.messages[0] as Record<string, unknown>
    expect(msg.usage).toEqual({ input: 10, output: 5, totalTokens: 15 })
    expect(msg.model).toBe('gpt-5')
  })

  it('still rejects a body missing the required id', () => {
    expect(() =>
      postRequestBodySchema.parse({ advancedTools: [], messages: [] })
    ).toThrow()
  })
})

describe('postRequestBodySchema — reasoningEffort', () => {
  it('accepts a request with no reasoningEffort', () => {
    const parsed = postRequestBodySchema.parse({
      id: CHAT_ID,
      advancedTools: [],
      messages: []
    })
    expect(parsed.reasoningEffort).toBeUndefined()
  })

  it('accepts every valid effort level', () => {
    for (const level of ['off', 'low', 'medium', 'high', 'xhigh', 'max']) {
      const parsed = postRequestBodySchema.parse({
        id: CHAT_ID,
        advancedTools: [],
        messages: [],
        reasoningEffort: level
      })
      expect(parsed.reasoningEffort, level).toBe(level)
    }
  })

  it('rejects an invalid effort level', () => {
    expect(() =>
      postRequestBodySchema.parse({
        id: CHAT_ID,
        advancedTools: [],
        messages: [],
        reasoningEffort: 'ultra'
      })
    ).toThrow()
  })
})
