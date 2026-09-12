import {
  isEmptyAssistantTurn,
  toFriendlyChatError
} from '@main/lib/server/routes/chat-errors'
import { describe, expect, it } from 'vitest'

describe('isEmptyAssistantTurn', () => {
  it('flags the silent gpt-5.5-pro empty turn (no content, zero tokens, stop)', () => {
    // The exact shape persisted for messages #10/#14 in the bug report.
    expect(
      isEmptyAssistantTurn({
        content: [],
        usage: {
          totalTokens: 0
        } as never
      })
    ).toBe(true)
  })

  it('does not flag a turn that produced text', () => {
    expect(
      isEmptyAssistantTurn({
        content: [{ type: 'text', text: 'Here is the analysis.' }],
        usage: { totalTokens: 0 }
      })
    ).toBe(false)
  })

  it('does not flag a turn that made a tool call (even with empty text)', () => {
    expect(
      isEmptyAssistantTurn({
        content: [{ type: 'thinking', text: '' }, { type: 'toolCall' }],
        usage: { totalTokens: 0 }
      })
    ).toBe(false)
  })

  it('does not flag a thinking-only refusal that still consumed tokens', () => {
    // tokens > 0 means the API really ran — leave it alone, it is not the
    // background/async empty-stream failure mode.
    expect(
      isEmptyAssistantTurn({
        content: [{ type: 'thinking', text: 'reasoning…' }],
        usage: { totalTokens: 1234 }
      })
    ).toBe(false)
  })

  it('treats whitespace-only text as empty', () => {
    expect(
      isEmptyAssistantTurn({
        content: [{ type: 'text', text: '   \n' }],
        usage: { totalTokens: 0 }
      })
    ).toBe(true)
  })

  it('handles missing usage/content defensively', () => {
    expect(isEmptyAssistantTurn({})).toBe(true)
  })
})

describe('toFriendlyChatError', () => {
  it('maps the OpenAI/Anthropic SDKs generic transport failure to a network hint', () => {
    // openai-node and @anthropic-ai/sdk both throw this exact message (no
    // status code, no provider-specific substring) when fetch() itself fails
    // (DNS/TLS/refused) — it must not fall through to the raw fallback.
    expect(toFriendlyChatError('Connection error.')).toBe(
      'Unable to connect to the AI provider. Please check your network connection and API base URL.'
    )
  })

  it('still falls back to the raw message for unrecognized errors', () => {
    expect(toFriendlyChatError('Something unexpected happened')).toBe(
      'Something unexpected happened'
    )
  })
})
