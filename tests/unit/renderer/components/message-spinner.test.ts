import type { ChatMessage } from '@shared/types/chat'
import { describe, expect, it } from 'vitest'

import { shouldShowMessageSpinner } from '@/components/message-spinner'
import { groupIntoSegments } from '@/components/messages'

const user = (id: string): ChatMessage => ({
  id,
  role: 'user',
  content: 'hello',
  timestamp: 1
})

const assistant = (id: string, content: unknown): ChatMessage =>
  ({ id, role: 'assistant', content, timestamp: 2 }) as ChatMessage

describe('shouldShowMessageSpinner', () => {
  it('shows right after submit (only a user message)', () => {
    const segments = groupIntoSegments([user('u1')])
    expect(shouldShowMessageSpinner(segments, true)).toBe(true)
  })

  it('keeps showing while pi-ai has only emitted an empty assistant message', () => {
    // The gap the fix targets: stream opened, no content yet.
    const segments = groupIntoSegments([
      user('u1'),
      assistant('a1', []),
      assistant('a2', [{ type: 'text', text: '' }])
    ])
    expect(segments[segments.length - 1]?.type).toBe('user')
    expect(shouldShowMessageSpinner(segments, true)).toBe(true)
  })

  it('hides once streamed text appears', () => {
    const segments = groupIntoSegments([
      user('u1'),
      assistant('a1', [{ type: 'text', text: 'Here is' }])
    ])
    expect(shouldShowMessageSpinner(segments, true)).toBe(false)
  })

  it('hides once a tool call appears', () => {
    const segments = groupIntoSegments([
      user('u1'),
      assistant('a1', [
        { type: 'toolCall', id: 'c1', name: 'webSearch', arguments: {} }
      ])
    ])
    expect(shouldShowMessageSpinner(segments, true)).toBe(false)
  })

  it('hides once a thinking block has real content', () => {
    const segments = groupIntoSegments([
      user('u1'),
      assistant('a1', [{ type: 'thinking', thinking: 'Let me consider…' }])
    ])
    expect(shouldShowMessageSpinner(segments, true)).toBe(false)
  })

  it('never shows when not loading', () => {
    const segments = groupIntoSegments([user('u1')])
    expect(shouldShowMessageSpinner(segments, false)).toBe(false)
  })
})
