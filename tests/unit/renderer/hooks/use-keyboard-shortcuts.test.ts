// @vitest-environment happy-dom
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

Object.defineProperty(navigator, 'platform', {
  value: 'Linux x86_64',
  configurable: true
})
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (X11; Linux x86_64)',
  configurable: true
})
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const navigate = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigate }))

let disabled: string[] = []
vi.mock('@/hooks/use-settings', () => ({
  useSettings: () => ({ data: { keyboardShortcuts: { disabled } } })
}))

const closeSearchbar = vi.fn(async () => {})
vi.mock('@/lib/ipc', () => ({ closeSearchbar: () => closeSearchbar() }))

const { useKeyboardShortcuts } = await import('@/hooks/use-keyboard-shortcuts')

function Probe() {
  useKeyboardShortcuts()
  return null
}

let root: ReturnType<typeof createRoot>

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init
      })
    )
  })
}

beforeEach(() => {
  disabled = []
  navigate.mockClear()
  closeSearchbar.mockClear()
  root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(Probe)))
})

afterEach(() => {
  act(() => root.unmount())
  document.body.replaceChildren()
})

describe('useKeyboardShortcuts', () => {
  it('Mod+Shift+E focuses the composer, found by its test id — not its placeholder', () => {
    const composer = document.createElement('textarea')
    composer.setAttribute('data-testid', TEST_IDS.composer.textarea)
    composer.placeholder = 'Ask anything'
    document.body.append(composer)

    press(document.body, 'E', { ctrlKey: true, shiftKey: true })

    expect(document.activeElement).toBe(composer)
  })

  it('Mod+N opens a new chat', () => {
    press(document.body, 'n', { ctrlKey: true })
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('Mod+N is left alone while typing in an input', () => {
    const input = document.createElement('input')
    document.body.append(input)
    press(input, 'n', { ctrlKey: true })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('Mod+, opens settings', () => {
    press(document.body, ',', { ctrlKey: true })
    expect(navigate).toHaveBeenCalledWith('/settings')
  })

  it('a shortcut the user turned off does nothing', () => {
    disabled = ['new-chat']
    act(() => root.render(createElement(Probe)))
    press(document.body, 'n', { ctrlKey: true })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('Escape closes the find bar, even from inside an input', () => {
    const input = document.createElement('input')
    document.body.append(input)
    press(input, 'Escape')
    expect(closeSearchbar).toHaveBeenCalledTimes(1)
  })

  it('Escape does nothing when close-find-bar is turned off', () => {
    disabled = ['close-find-bar']
    act(() => root.render(createElement(Probe)))
    press(document.body, 'Escape')
    expect(closeSearchbar).not.toHaveBeenCalled()
  })

  it('does not swallow the keydown, so window-level listeners still see it', () => {
    const seen = vi.fn()
    window.addEventListener('keydown', seen)
    press(document.body, 'n', { ctrlKey: true })
    window.removeEventListener('keydown', seen)
    expect(seen).toHaveBeenCalled()
  })
})
