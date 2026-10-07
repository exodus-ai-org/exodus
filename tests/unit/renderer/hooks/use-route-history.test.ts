// @vitest-environment happy-dom
// The recorder pushes what the router shows; an arrow moves the index and
// navigates without pushing a second entry.
import { createStore, Provider } from 'jotai'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const { useRouteHistory, useRouteHistoryRecorder } =
  await import('@/hooks/use-route-history')
const { historyAtom } = await import('@/stores/history')

function Probe() {
  useRouteHistoryRecorder()
  const { canGoBack, canGoForward, goBack, goForward } = useRouteHistory()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return createElement(
    'div',
    null,
    createElement('span', { id: 'path' }, pathname),
    createElement('button', { id: 'open', onClick: () => navigate('/chat/a') }),
    createElement('button', {
      id: 'openB',
      onClick: () => navigate('/chat/b')
    }),
    createElement('button', { id: 'home', onClick: () => navigate('/') }),
    createElement('button', {
      id: 'back',
      disabled: !canGoBack,
      onClick: goBack
    }),
    createElement('button', {
      id: 'forward',
      disabled: !canGoForward,
      onClick: goForward
    })
  )
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
let store: ReturnType<typeof createStore>

const click = (id: string) =>
  act(() => host.querySelector<HTMLButtonElement>(`#${id}`)!.click())
const path = () => host.querySelector('#path')!.textContent
const disabled = (id: string) =>
  host.querySelector<HTMLButtonElement>(`#${id}`)!.disabled

beforeEach(() => {
  store = createStore()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() =>
    root.render(
      createElement(
        Provider,
        { store },
        createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '*', element: createElement(Probe) })
          )
        )
      )
    )
  )
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('useRouteHistory', () => {
  it('records the first page with both arrows off', () => {
    expect(store.get(historyAtom)).toEqual({
      entries: ['/'],
      index: 0,
      skipNext: false
    })
    expect(disabled('back')).toBe(true)
    expect(disabled('forward')).toBe(true)
  })

  it('an arrow moves the index and navigates, without pushing again', () => {
    click('open')
    expect(path()).toBe('/chat/a')
    expect(disabled('back')).toBe(false)

    click('back')
    expect(path()).toBe('/')
    expect(store.get(historyAtom)).toEqual({
      entries: ['/', '/chat/a'],
      index: 0,
      skipNext: false
    })
    expect(disabled('forward')).toBe(false)

    click('forward')
    expect(path()).toBe('/chat/a')
    expect(store.get(historyAtom).index).toBe(1)
    expect(disabled('forward')).toBe(true)
  })

  it('a page opened after going back replaces the forward branch', () => {
    click('open')
    click('back')
    click('home')
    // Home again from home: the same entry, nothing pushed, the forward page still there.
    expect(store.get(historyAtom)).toEqual({
      entries: ['/', '/chat/a'],
      index: 0,
      skipNext: false
    })
    click('openB')
    expect(store.get(historyAtom)).toEqual({
      entries: ['/', '/chat/b'],
      index: 1,
      skipNext: false
    })
  })
})
