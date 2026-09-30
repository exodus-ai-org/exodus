// @vitest-environment happy-dom
// A turn shows the model's text and its tools' cards in the order the run
// produced them — not every card above all of the text — and doing so costs
// the streaming path nothing: text that is settled is not rendered again
// while the text after a card streams.
import type { ChatMessage } from '@exodus/shared/types/chat'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const markdownRenders = new Map<string, number>()
vi.mock('@/components/markdown', async () => {
  const { memo } = await import('react')
  return {
    // Memoized on its props, as the real one is.
    default: memo(function Markdown({ src }: { src: string }) {
      markdownRenders.set(src, (markdownRenders.get(src) ?? 0) + 1)
      return createElement('div', { 'data-piece': `text:${src}` })
    })
  }
})
vi.mock('@/components/messages-calling-tools', () => ({
  MessageCallingTools: ({
    toolResult
  }: {
    toolResult: { toolCallId: string }
  }) => createElement('div', { 'data-piece': `card:${toolResult.toolCallId}` })
}))
vi.mock(
  '@/components/calling-tools/image-generation/image-generation-card',
  () => ({
    ImageGenerationCard: ({ prompt }: { prompt: string }) =>
      createElement('div', { 'data-piece': `image:${prompt}` })
  })
)
vi.mock('@/components/massage-action', () => ({
  MessageAction: () => createElement('div', { 'data-piece': 'actions' })
}))

const t = (key: string) => key
const i18n = { language: 'en' }
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t, i18n }) }))
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
vi.mock('@/components/message-spinner', () => ({
  MessageSpinner: () => null,
  shouldShowMessageSpinner: () => false
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
vi.mock('@/hooks/use-memory', () => ({
  useMemories: () => ({ data: undefined, isLoading: false }),
  useRunMemoryUsage: () => [],
  useUndoMemoryChanges: () => ({ mutate: vi.fn(), isPending: false }),
  useInvalidateMemory: () => vi.fn()
}))
vi.mock('@/hooks/use-approvals', () => ({
  useRunApprovals: () => [],
  useDecideApproval: () => ({ mutate: vi.fn(), isPending: false })
}))

const { default: Messages } = await import('@/components/messages')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const RUN = 'u1'
const user = {
  id: RUN,
  runId: RUN,
  role: 'user',
  content: 'weather, then a picture',
  timestamp: 1
} as ChatMessage
const step = (id: string, content: object[]) =>
  ({
    id,
    runId: RUN,
    role: 'assistant',
    content,
    stopReason: 'toolUse',
    timestamp: 2
  }) as unknown as ChatMessage
const text = (value: string) => ({ type: 'text', text: value })
const call = (id: string, name: string, args: object = {}) => ({
  type: 'toolCall',
  id,
  name,
  arguments: args
})
const result = (toolCallId: string, toolName: string) =>
  ({
    id: `r-${toolCallId}`,
    runId: RUN,
    role: 'toolResult',
    toolCallId,
    toolName,
    content: [],
    details: {},
    isError: false,
    timestamp: 3
  }) as unknown as ChatMessage

// text → weather card → text → image → text
const SETTLED: ChatMessage[] = [
  user,
  step('a1', [text('Checking the weather.'), call('c1', 'weather')]),
  result('c1', 'weather'),
  step('a2', [
    text('Sunny. Drawing it.'),
    call('g1', 'image_generation', { prompt: 'a sunny day' })
  ]),
  result('g1', 'image_generation')
]

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement

async function show(status: string, messages: ChatMessage[]) {
  await act(async () =>
    root.render(
      createElement(Messages, {
        chatId: 'chat-1',
        status,
        messages,
        regenerate
      } as never)
    )
  )
}
const regenerate = vi.fn()

const pieces = () =>
  [...host.querySelectorAll('[data-piece]')].map((el) =>
    el.getAttribute('data-piece')
  )

beforeEach(() => {
  markdownRenders.clear()
  host = document.createElement('div')
  root = createRoot(host)
})

describe('<Messages>: a turn in the order the run produced it', () => {
  it('draws text and cards where the model put them, above one action bar', async () => {
    await show('ready', [...SETTLED, step('a3', [text('There you go.')])])

    expect(pieces()).toEqual([
      'text:Checking the weather.',
      'card:c1',
      'text:Sunny. Drawing it.',
      'image:a sunny day',
      'text:There you go.',
      'actions'
    ])
  })

  it('does not render the text above a card again while the text below it streams', async () => {
    await show('streaming', SETTLED)
    const before = new Map(markdownRenders)

    for (const frame of ['Th', 'There', 'There you go.']) {
      await show('streaming', [...SETTLED, step('a3', [text(frame)])])
      expect(markdownRenders.get(frame)).toBe(1)
    }

    expect(markdownRenders.get('Checking the weather.')).toBe(
      before.get('Checking the weather.')
    )
    expect(markdownRenders.get('Sunny. Drawing it.')).toBe(
      before.get('Sunny. Drawing it.')
    )
    expect(pieces().slice(0, 4)).toEqual([
      'text:Checking the weather.',
      'card:c1',
      'text:Sunny. Drawing it.',
      'image:a sunny day'
    ])
  })
})
