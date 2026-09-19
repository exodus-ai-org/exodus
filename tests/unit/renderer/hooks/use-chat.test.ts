// @vitest-environment happy-dom
import type { ChatMessage } from '@exodus/shared/types/chat'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamSubscriber } from '@/lib/stream-manager'

const startStream = vi.fn()
vi.mock('@/lib/stream-manager', () => ({
  startStream: (...args: unknown[]) => startStream(...args),
  stopStream: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  isStreaming: () => false
}))

const { useChat } = await import('@/hooks/use-chat')
type Helpers = ReturnType<typeof useChat>

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let latest: Helpers

function Probe({
  prepareBody
}: {
  prepareBody: () => Record<string, unknown>
}) {
  latest = useChat({
    id: 'chat-1',
    chatTitle: 'Title',
    api: '/api/v1/chat',
    messages: [],
    prepareBody: ({ messages }) => ({ ...prepareBody(), messages })
  })
  return null
}

function assistantFrame(text: string): ChatMessage {
  return {
    id: 'a1',
    role: 'assistant',
    content: [{ type: 'text', text }],
    usage: { input: 1, output: text.length, totalTokens: 1 + text.length },
    timestamp: 1
  } as unknown as ChatMessage
}

let root: ReturnType<typeof createRoot>

async function mount(prepareBody: () => Record<string, unknown>) {
  root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Probe, { prepareBody })))
}

beforeEach(() => {
  startStream.mockReset()
})

describe('useChat', () => {
  // `regenerate` is a prop of every assistant turn in the transcript and
  // `sendMessage` of the composer, both memoized. An identity that changes per
  // streamed frame re-renders all of them per frame — which is what happened.
  it('keeps sendMessage / regenerate / stop stable while a reply streams', async () => {
    await mount(() => ({}))
    await act(async () => latest.sendMessage({ text: 'hi' }))
    const { sendMessage, regenerate, stop, setMessages } = latest
    const subscriber = startStream.mock.calls[0][0]
      .subscriber as StreamSubscriber
    const user = latest.messages[0]

    for (const text of ['H', 'He', 'Hel', 'Hello']) {
      await act(async () => subscriber.onMessages([user, assistantFrame(text)]))
      expect(latest.sendMessage).toBe(sendMessage)
      expect(latest.regenerate).toBe(regenerate)
      expect(latest.stop).toBe(stop)
      expect(latest.setMessages).toBe(setMessages)
    }
    expect(latest.messages).toHaveLength(2)
  })

  it('still sends the live transcript and the latest prepareBody, stable identity or not', async () => {
    let tools = ['webSearch']
    await mount(() => ({ advancedTools: tools }))
    await act(async () => latest.sendMessage({ text: 'first' }))
    const subscriber = startStream.mock.calls[0][0]
      .subscriber as StreamSubscriber
    await act(async () =>
      subscriber.onMessages([latest.messages[0], assistantFrame('answer')])
    )

    tools = ['terminal']
    await act(async () =>
      root.render(
        createElement(Probe, { prepareBody: () => ({ advancedTools: tools }) })
      )
    )
    await act(async () => latest.sendMessage({ text: 'second' }))

    const body = startStream.mock.calls[1][0].body as {
      advancedTools: string[]
      messages: ChatMessage[]
    }
    expect(body.advancedTools).toEqual(['terminal'])
    expect(body.messages.map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'user'
    ])
  })

  it('applies a functional setMessages against the live list', async () => {
    await mount(() => ({}))
    await act(async () => latest.sendMessage({ text: 'hi' }))
    await act(async () =>
      latest.setMessages((prev) => [...prev, assistantFrame('x')])
    )
    await act(async () => latest.setMessages((prev) => prev.slice(1)))

    expect(latest.messages.map((m) => m.role)).toEqual(['assistant'])
  })

  it('does not re-render for a frame whose usage numbers did not change', async () => {
    await mount(() => ({}))
    await act(async () => latest.sendMessage({ text: 'hi' }))
    const subscriber = startStream.mock.calls[0][0]
      .subscriber as StreamSubscriber
    const frame = [latest.messages[0], assistantFrame('same')]
    await act(async () => subscriber.onMessages(frame))
    const usageBefore = latest.lastUsage

    // Same numbers, but a freshly parsed object — as every SSE frame is.
    await act(async () =>
      subscriber.onMessages([frame[0], assistantFrame('same')])
    )
    expect(latest.lastUsage).toBe(usageBefore)
  })
})
