// @vitest-environment happy-dom
import type { ChatMessage } from '@exodus/shared/types/chat'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// How many times each piece of markdown was rendered, by its text.
const markdownRenders = new Map<string, number>()
const sourcesSeen = new Map<string, unknown>()

vi.mock('@/components/markdown', () => ({
  default: ({
    src,
    webSearchResults
  }: {
    src: string
    webSearchResults?: unknown
  }) => {
    markdownRenders.set(src, (markdownRenders.get(src) ?? 0) + 1)
    sourcesSeen.set(src, webSearchResults)
    return null
  }
}))

// `t` must be one function, as it is in react-i18next: Messages resets its
// segment caches whenever it changes (turn labels are translated when built).
const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/lib/i18n', () => ({ i18n: { t } }))
vi.mock('@/hooks/use-settings', () => ({
  useSettings: () => ({ data: undefined })
}))
vi.mock('@/hooks/use-discover-feed', () => ({
  useDiscoverFeed: () => ({ feed: undefined })
}))
vi.mock('@/components/ui/button', () => ({ Button: () => null }))
vi.mock('@/components/chat-toc', () => ({ ChatToc: () => null }))
vi.mock('@/components/home/discover-feed', () => ({ DiscoverFeed: () => null }))
vi.mock('@/components/massage-action', () => ({ MessageAction: () => null }))
vi.mock('@/components/message-spinner', () => ({
  MessageSpinner: () => null,
  shouldShowMessageSpinner: () => false
}))
vi.mock('@/components/messages-calling-tools', () => ({
  MessageCallingTools: () => null
}))
vi.mock('@/components/thinking-timeline', () => ({
  ThinkingTimeline: () => null
}))
vi.mock('@/components/web-search/image-gallery', () => ({
  ImageGallery: () => null
}))
vi.mock('@/components/web-search/video-cards', () => ({
  VideoCards: () => null
}))
vi.mock('react-medium-image-zoom', () => ({
  default: ({ children }: { children: unknown }) => children
}))

const startStream = vi.fn()
vi.mock('@/lib/stream-manager', () => ({
  startStream: (...args: unknown[]) => startStream(...args),
  stopStream: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  isStreaming: () => false
}))

const {
  default: Messages,
  buildCitationSources,
  groupIntoSegments
} = await import('@/components/messages')
const { useChat } = await import('@/hooks/use-chat')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const SOURCES: WebSearchResult[] = [
  {
    rank: 1,
    link: 'https://example.com/a',
    title: 'A',
    content: 'a',
    snippet: 'a'
  },
  {
    rank: 2,
    link: 'https://example.com/b',
    title: 'B',
    content: 'b',
    snippet: 'b'
  }
] as WebSearchResult[]

// Every message carries its run (the user message's id).
const user = (id: string, text: string) =>
  ({ id, runId: id, role: 'user', content: text, timestamp: 1 }) as ChatMessage
const assistant = (id: string, text: string, runId = `u${id.slice(1)}`) =>
  ({
    id,
    runId,
    role: 'assistant',
    content: [{ type: 'text', text }],
    timestamp: 2
  }) as unknown as ChatMessage
const webSearch = (id: string, runId = `u${id.slice(1)}`) =>
  ({
    id,
    runId,
    role: 'toolResult',
    toolCallId: `call-${id}`,
    toolName: 'web_search',
    content: [{ type: 'text', text: 'results' }],
    details: SOURCES,
    isError: false,
    timestamp: 2
  }) as unknown as ChatMessage

// Two finished turns — the first ran a web search, so every later turn carries
// citation sources — and a third that is streaming.
const HISTORY: ChatMessage[] = [
  user('u1', 'first question'),
  webSearch('t1'),
  assistant('a1', 'First answer 【1-source】'),
  user('u2', 'second question'),
  assistant('a2', 'Second answer'),
  user('u3', 'third question')
]

/** One streamed frame: same history objects, a fresh last message. */
const frame = (text: string) => [...HISTORY, assistant('a3', text)]

beforeEach(() => {
  markdownRenders.clear()
  sourcesSeen.clear()
})

describe('groupIntoSegments with a cache', () => {
  it('hands back the same segment objects for everything a frame did not touch', () => {
    const cache = new Map()
    const before = groupIntoSegments(frame('Th'), cache)
    const after = groupIntoSegments(frame('Thi'), cache)

    expect(after).toHaveLength(before.length)
    expect(after.slice(0, -1)).toEqual(before.slice(0, -1))
    after.slice(0, -1).forEach((segment, i) => expect(segment).toBe(before[i]))
    expect(after.at(-1)).not.toBe(before.at(-1))
  })

  it('gives the same result as without a cache', () => {
    const cache = new Map()
    groupIntoSegments(frame('Th'), cache)
    expect(groupIntoSegments(frame('Thi'), cache)).toEqual(
      groupIntoSegments(frame('Thi'))
    )
  })

  it('forgets segments that are no longer in the chat', () => {
    const cache = new Map()
    groupIntoSegments(frame('Th'), cache)
    groupIntoSegments([user('x1', 'a new chat')], cache)
    expect([...cache.keys()]).toEqual(['user:x1'])
  })
})

describe('buildCitationSources with a cache', () => {
  it('reuses the arrays of turns whose sources cannot have changed', () => {
    const segmentCache = new Map()
    const cache = { turns: [], sources: [] }
    const first = buildCitationSources(
      groupIntoSegments(frame('Th'), segmentCache),
      cache
    )
    const second = buildCitationSources(
      groupIntoSegments(frame('Thi'), segmentCache),
      cache
    )

    const [turn1, turn2] = [...second.keys()]
    expect(second.get(turn1)).toBe(first.get(turn1))
    expect(second.get(turn2)).toBe(first.get(turn2))
    expect(second.get(turn2)).toEqual(SOURCES)
  })

  it('rebuilds from the turn that changed onwards', () => {
    const segmentCache = new Map()
    const cache = { turns: [], sources: [] }
    const before = buildCitationSources(
      groupIntoSegments(HISTORY, segmentCache),
      cache
    )
    // A search lands in the third turn: its sources grow, earlier turns' do not.
    const withSearch = [...HISTORY, webSearch('t3'), assistant('a3', 'cited')]
    const after = buildCitationSources(
      groupIntoSegments(withSearch, segmentCache),
      cache
    )

    const turns = [...after.keys()]
    expect(after.get(turns[0])).toBe(before.get(turns[0]))
    expect(after.get(turns[1])).toBe(before.get(turns[1]))
    expect(after.get(turns[2])).toHaveLength(SOURCES.length * 2)
  })
})

// The real hook feeding the real list, as <Chat> wires them: the transcript's
// memoization only holds if what useChat hands down (`regenerate`) holds still
// too, and that is exactly what had silently stopped being true.
let send: ReturnType<typeof useChat>['sendMessage']

function ChatUnderTest() {
  const { messages, status, regenerate, sendMessage } = useChat({
    id: 'chat-1',
    chatTitle: 'Title',
    api: '/api/v1/chat',
    messages: HISTORY.slice(0, -1)
  })
  send = sendMessage
  return createElement(Messages, {
    chatId: 'chat-1',
    status,
    messages,
    regenerate
  })
}

describe('<Messages> while a reply streams', () => {
  it('re-renders the streaming turn only — not the transcript above it', async () => {
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(ChatUnderTest)))
    await act(async () => send({ text: 'third question' }))
    const { subscriber, initialMessages } = startStream.mock.calls[0][0]

    expect(markdownRenders.get('First answer 【1-source】')).toBeGreaterThan(0)
    const settled = new Map(markdownRenders)
    const firstTurnSources = sourcesSeen.get('First answer 【1-source】')
    expect(firstTurnSources).toEqual(SOURCES)

    for (const text of ['Th', 'Thi', 'Thir', 'Third', 'Third answer']) {
      await act(async () =>
        subscriber.onMessages([...initialMessages, assistant('a3', text)])
      )
      expect(markdownRenders.get(text)).toBe(1)
    }

    // Finished turns: not rendered again, whatever streamed below them —
    // including the ones holding citation sources, whose array used to be
    // rebuilt (and so their markdown re-parsed) on every frame.
    expect(markdownRenders.get('First answer 【1-source】')).toBe(
      settled.get('First answer 【1-source】')
    )
    expect(markdownRenders.get('Second answer')).toBe(
      settled.get('Second answer')
    )
    expect(sourcesSeen.get('First answer 【1-source】')).toBe(firstTurnSources)
  })
})
