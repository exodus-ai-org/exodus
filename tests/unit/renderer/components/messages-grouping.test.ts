// @vitest-environment happy-dom
import type { ChatMessage } from '@exodus/shared/types/chat'
import { describe, expect, it, vi } from 'vitest'

const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/lib/i18n', () => ({ i18n: { t } }))
vi.mock('@/hooks/use-settings', () => ({
  useSettings: () => ({ data: undefined })
}))
vi.mock('@/hooks/use-discover-feed', () => ({
  useDiscoverFeed: () => ({ feed: undefined })
}))
vi.mock('@/components/markdown', () => ({ default: () => null }))
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

const { groupIntoSegments } = await import('@/components/messages')

const R1 = '11111111-1111-4111-8111-111111111111'
const R2 = '22222222-2222-4222-8222-222222222222'

const user = (id: string): ChatMessage => ({
  id,
  runId: id,
  role: 'user',
  content: 'q',
  timestamp: 1
})
const asst = (
  id: string,
  runId: string,
  text: string,
  stopReason: 'stop' | 'toolUse' = 'stop'
): ChatMessage =>
  ({
    id,
    runId,
    role: 'assistant',
    content: [{ type: 'text', text }],
    stopReason,
    timestamp: 2
  }) as unknown as ChatMessage
const tool = (id: string, runId: string): ChatMessage => ({
  id,
  runId,
  role: 'toolResult',
  toolCallId: 'c',
  toolName: 'weather',
  content: [],
  details: null,
  isError: false,
  timestamp: 3
})

function turns(segments: ReturnType<typeof groupIntoSegments>) {
  return segments.map((s) =>
    s.type === 'assistantTurn' ? s.turn.runId : 'user'
  )
}

describe('groupIntoSegments by runId', () => {
  it('one run is one assistant segment whose body joins every text block in order', () => {
    const segs = groupIntoSegments([
      user(R1),
      asst('a1', R1, 'Looking that up.', 'toolUse'),
      tool('t1', R1),
      asst('a2', R1, 'It is sunny.')
    ])
    expect(turns(segs)).toEqual(['user', R1])
    const turn = segs[1].type === 'assistantTurn' ? segs[1].turn : null
    expect(turn?.body).toBe('Looking that up.\n\nIt is sunny.')
    expect(turn?.messages).toHaveLength(3)
  })

  it('two runs are two segments even with no user message between them', () => {
    // A send that failed before any reply, then a second send.
    const segs = groupIntoSegments([user(R1), user(R2), asst('a1', R2, 'hi')])
    expect(turns(segs)).toEqual(['user', 'user', R2])
  })

  it('rows of different runs never share a segment', () => {
    const segs = groupIntoSegments([
      user(R1),
      asst('a1', R1, 'one'),
      asst('a2', R2, 'two')
    ])
    expect(turns(segs)).toEqual(['user', R1, R2])
  })

  it('a message without a runId joins the run of the user message before it', () => {
    const legacy = { ...asst('a1', R1, 'hi') } as ChatMessage & {
      runId?: string
    }
    delete legacy.runId
    const segs = groupIntoSegments([user(R1), legacy])
    expect(turns(segs)).toEqual(['user', R1])
  })

  it('a run without a user message (an orphan) still renders', () => {
    const segs = groupIntoSegments([asst('a1', R1, 'hi')])
    expect(turns(segs)).toEqual([R1])
  })

  it('a cache hands back the same segment for a run a frame did not touch', () => {
    const cache = new Map()
    const first = [
      user(R1),
      asst('a1', R1, 'one'),
      user(R2),
      asst('a2', R2, 'tw')
    ]
    const before = groupIntoSegments(first, cache)
    const after = groupIntoSegments(
      [...first.slice(0, 3), asst('a2', R2, 'two')],
      cache
    )
    expect(after[1]).toBe(before[1])
    expect(after[3]).not.toBe(before[3])
  })
})
