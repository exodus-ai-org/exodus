import type { ChatMessage } from '@exodus/shared/types/chat'
import { highestSourceRank } from '@main/lib/ai/utils/web-sources'
import { describe, expect, it } from 'vitest'

const result = (toolName: string, details: unknown, isError = false) =>
  ({
    id: crypto.randomUUID(),
    role: 'toolResult',
    toolCallId: 'c',
    toolName,
    content: [],
    details,
    isError,
    timestamp: 1
  }) as unknown as ChatMessage

describe('highestSourceRank', () => {
  it('is the highest number a source of the conversation carries', () => {
    expect(
      highestSourceRank([
        { id: 'u', role: 'user', content: 'q', timestamp: 1 } as ChatMessage,
        result('web_search', [{ rank: 1 }, { rank: 2 }, { rank: 3 }]),
        result('web_fetch', { rank: 4, link: 'https://a.example' }),
        result('web_search', [{ rank: 5 }])
      ])
    ).toBe(5)
  })

  it('is 0 for a conversation that has cited nothing', () => {
    expect(highestSourceRank([])).toBe(0)
    expect(
      highestSourceRank([
        { id: 'u', role: 'user', content: 'q', timestamp: 1 } as ChatMessage,
        result('weather', { rank: 9 })
      ])
    ).toBe(0)
  })

  it('reads past what is not a source', () => {
    expect(
      highestSourceRank([
        result('web_search', [{ rank: 2 }, { title: 'no rank' }, null, 7]),
        result('web_fetch', { url: 'https://a.example', length: 10 }),
        result('web_search', 'not a list'),
        result('web_search', [{ rank: 40 }], true)
      ])
    ).toBe(2)
  })
})
