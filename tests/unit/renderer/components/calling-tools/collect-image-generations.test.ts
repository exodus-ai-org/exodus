import type { ChatMessage } from '@exodus/shared/types/chat'
import { describe, expect, it } from 'vitest'

import { collectImageGenerations } from '@/components/calling-tools/image-generation/collect-image-generations'

const assistant = (content: Array<Record<string, unknown>>): ChatMessage =>
  ({
    id: `a-${Math.random()}`,
    runId: 'r1',
    role: 'assistant',
    content,
    timestamp: 1
  }) as unknown as ChatMessage

const toolResult = (
  toolCallId: string,
  toolName: string,
  isError = false
): ChatMessage =>
  ({
    id: `t-${toolCallId}`,
    runId: 'r1',
    role: 'toolResult',
    toolCallId,
    toolName,
    isError,
    content: [{ type: 'text', text: '{}' }],
    details: null,
    timestamp: 2
  }) as unknown as ChatMessage

describe('collectImageGenerations', () => {
  it('pairs each image_generation call with its result, in call order, and ignores other tools', () => {
    const r2 = toolResult('c2', 'image_generation', true)
    const calls = collectImageGenerations([
      assistant([
        {
          type: 'toolCall',
          id: 'c1',
          name: 'image_generation',
          arguments: { prompt: 'a fox' }
        },
        {
          type: 'toolCall',
          id: 'w1',
          name: 'weather',
          arguments: { location: 'Oslo' }
        },
        {
          type: 'toolCall',
          id: 'c2',
          name: 'image_generation',
          arguments: { prompt: 'a cat' }
        }
      ]),
      toolResult('w1', 'weather'),
      r2
    ])

    expect(calls.map((c) => [c.toolCallId, c.prompt])).toEqual([
      ['c1', 'a fox'],
      ['c2', 'a cat']
    ])
    expect(calls[0].result).toBeUndefined()
    expect(calls[1].result).toBe(r2)
  })

  it('reads a prompt that has not streamed in yet as empty', () => {
    const [call] = collectImageGenerations([
      assistant([
        { type: 'toolCall', id: 'c1', name: 'image_generation', arguments: {} }
      ])
    ])
    expect(call.prompt).toBe('')
  })
})
