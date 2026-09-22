import type { Message } from '@earendil-works/pi-ai'
import { dropBrokenRuns } from '@main/lib/ai/kernel/invariant'
import { describe, expect, it } from 'vitest'

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
}
const user = (t: string): Message => ({
  role: 'user',
  content: t,
  timestamp: 1
})
const call = (id: string): Message => ({
  role: 'assistant',
  content: [{ type: 'toolCall', id, name: 'weather', arguments: {} }],
  api: 'a',
  provider: 'p',
  model: 'm',
  usage,
  stopReason: 'toolUse',
  timestamp: 2
})
const result = (id: string): Message => ({
  role: 'toolResult',
  toolCallId: id,
  toolName: 'weather',
  content: [],
  isError: false,
  timestamp: 3
})
const text = (t: string): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text: t }],
  api: 'a',
  provider: 'p',
  model: 'm',
  usage,
  stopReason: 'stop',
  timestamp: 4
})

describe('dropBrokenRuns', () => {
  it('keeps a well-formed conversation untouched', () => {
    const msgs = [
      user('a'),
      call('1'),
      result('1'),
      text('x'),
      user('b'),
      text('y')
    ]
    expect(dropBrokenRuns(msgs)).toEqual({ messages: msgs, dropped: 0 })
  })

  it('drops leading rows that precede the first user message', () => {
    const msgs = [result('9'), text('x'), user('a'), text('y')]
    expect(dropBrokenRuns(msgs)).toEqual({
      messages: [user('a'), text('y')],
      dropped: 1
    })
  })

  it('drops a run whose toolResult has no toolCall before it', () => {
    const msgs = [
      user('a'),
      result('1'),
      text('x'),
      user('b'),
      call('2'),
      result('2')
    ]
    expect(dropBrokenRuns(msgs)).toEqual({
      messages: [user('b'), call('2'), result('2')],
      dropped: 1
    })
  })

  it('returns an empty list when nothing is well-formed', () => {
    expect(dropBrokenRuns([text('x')])).toEqual({ messages: [], dropped: 1 })
  })

  it('an empty list is fine', () => {
    expect(dropBrokenRuns([])).toEqual({ messages: [], dropped: 0 })
  })
})
