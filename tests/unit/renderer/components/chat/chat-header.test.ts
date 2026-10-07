// @vitest-environment happy-dom
// The header's two sides: on a chat page the title with its streaming dot,
// the model chip and the menu on the left; the phone dot and the panel
// toggle on the right. (The history arrows sit beside the sidebar toggle:
// history-arrows.test.ts.)
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { ChatMessage } from '@exodus/shared/types/chat'
import { createStore, Provider } from 'jotai'
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Chat } from '@/types/db'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))

const chats: Chat[] = [
  {
    id: 'c1',
    title: 'Trip planning',
    createdAt: new Date('2026-09-29T08:00:00.000Z'),
    favorite: false
  } as Chat
]
vi.mock('@/hooks/use-chat-history', () => ({
  useChatHistory: () => ({ data: chats, isLoading: false })
}))

let lastSeenAt: string | null = null
vi.mock('@/hooks/use-devices', () => ({
  useDevices: () => ({
    data: {
      devices: [
        {
          id: 'd1',
          name: 'Phone',
          createdAt: '2026-10-01T00:00:00.000Z',
          lastSeenAt
        }
      ],
      pairing: null,
      lanRunning: true
    }
  })
}))

// The chip and the menu have tests of their own.
vi.mock('@/components/chat/header/model-chip', () => ({
  ModelChip: () => createElement('div', { 'data-stub': 'chip' })
}))
vi.mock('@/components/chat/header/chat-menu', () => ({
  ChatMenu: () => createElement('div', { 'data-stub': 'menu' })
}))

const pass =
  (tag: string) =>
  ({ children, render, ...props }: Record<string, unknown>) =>
    render
      ? createElement(
          (render as { type: string }).type,
          {
            ...(render as { props: object }).props,
            ...Object.fromEntries(
              Object.entries(props).filter(([k]) => k.startsWith('data-'))
            )
          },
          children as ReactNode
        )
      : createElement(tag, {}, children as ReactNode)
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: pass('span'),
  TooltipTrigger: pass('span'),
  TooltipContent: () => null,
  TooltipProvider: pass('div')
}))

const { ChatHeader } = await import('@/components/chat/header/chat-header')
const { historyAtom } = await import('@/stores/history')
const { EMPTY_HISTORY, pushed } = await import('@/lib/route-history')
const { chatMessagesAtom, chatPanelAtom } = await import('@/stores/chat')
const { chatStatusAtom } = await import('@/stores/input')

const visit = (...paths: string[]) => paths.reduce(pushed, EMPTY_HISTORY)

const mounted: Array<() => void> = []
afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
  lastSeenAt = null
})

function mount(
  path: string,
  setup: (store: ReturnType<typeof createStore>) => void = () => {}
) {
  const store = createStore()
  store.set(historyAtom, visit(path))
  setup(store)
  const router = createMemoryRouter(
    [
      { path: '/', element: createElement(ChatHeader) },
      { path: '/chat/:id', element: createElement(ChatHeader) },
      { path: '*', element: null }
    ],
    { initialEntries: [path] }
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() =>
    root.render(
      createElement(
        Provider,
        { store },
        createElement(RouterProvider, { router })
      )
    )
  )
  mounted.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  const byId = (id: string) =>
    host.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  return { host, store, router, byId }
}

describe('<ChatHeader>', () => {
  it('on a chat page shows the title group on the left and the controls on the right', () => {
    const { host, byId } = mount('/chat/c1')
    expect(byId(TEST_IDS.chat.header.title)?.textContent).toBe('Trip planning')
    expect(host.querySelector('[data-stub="chip"]')).not.toBeNull()
    expect(host.querySelector('[data-stub="menu"]')).not.toBeNull()
    expect(byId(TEST_IDS.chat.header.phone)).not.toBeNull()
    expect(byId(TEST_IDS.chat.header.panelToggle)).not.toBeNull()
  })

  it('off a chat page keeps the phone dot only', () => {
    const { host, byId } = mount('/')
    expect(byId(TEST_IDS.chat.header.title)).toBeNull()
    expect(host.querySelector('[data-stub="chip"]')).toBeNull()
    expect(byId(TEST_IDS.chat.header.panelToggle)).toBeNull()
    expect(byId(TEST_IDS.chat.header.phone)).not.toBeNull()
  })

  it('a chat the list does not know yet is called New chat', () => {
    const { byId } = mount('/chat/unknown')
    expect(byId(TEST_IDS.chat.header.title)?.textContent).toBe(
      'sidebar.newChat'
    )
  })

  it('a dot after the title while a reply is on its way', () => {
    const { host } = mount('/chat/c1', (store) =>
      store.set(chatStatusAtom, 'streaming')
    )
    expect(host.querySelector('[data-streaming]')).not.toBeNull()
    const idle = mount('/chat/c1', (store) => store.set(chatStatusAtom, 'idle'))
    expect(idle.host.querySelector('[data-streaming]')).toBeNull()
  })

  it('the panel toggle opens the panel, and carries a dot once there is something to show', () => {
    const { byId, store, host } = mount('/chat/c1')
    expect(host.querySelector('[data-has-items]')).toBeNull()
    act(() => byId(TEST_IDS.chat.header.panelToggle)!.click())
    expect(store.get(chatPanelAtom).open).toBe(true)

    const withTool = mount('/chat/c1', (store) =>
      store.set(chatMessagesAtom, [
        {
          id: 'r1-t',
          runId: 'r1',
          role: 'toolResult',
          toolCallId: 'k',
          toolName: 'terminal',
          content: [{ type: 'text', text: 'ok' }],
          isError: false,
          timestamp: 1
        } as unknown as ChatMessage
      ])
    )
    expect(withTool.host.querySelector('[data-has-items]')).not.toBeNull()
  })

  it('the phone dot is green for a phone seen in the last five minutes, and opens Settings › Devices', () => {
    lastSeenAt = new Date().toISOString()
    const online = mount('/')
    expect(online.byId(TEST_IDS.chat.header.phone)?.dataset.online).toBe('true')

    lastSeenAt = null
    const { byId, router } = mount('/')
    expect(byId(TEST_IDS.chat.header.phone)?.dataset.online).toBe('false')
    act(() => byId(TEST_IDS.chat.header.phone)!.click())
    expect(
      `${router.state.location.pathname}${router.state.location.search}`
    ).toBe('/settings?tab=devices')
  })

  it('the phone dot greys out on its own once the last visit ages past the window, with the list unchanged', () => {
    vi.useFakeTimers()
    try {
      lastSeenAt = new Date().toISOString()
      const { byId } = mount('/')
      expect(byId(TEST_IDS.chat.header.phone)?.dataset.online).toBe('true')

      // Nothing re-renders the dot but its own clock: the minute poll hands
      // back the same list, which is the same object.
      act(() => {
        vi.advanceTimersByTime(6 * 60_000)
      })
      expect(byId(TEST_IDS.chat.header.phone)?.dataset.online).toBe('false')
    } finally {
      vi.useRealTimers()
    }
  })
})
