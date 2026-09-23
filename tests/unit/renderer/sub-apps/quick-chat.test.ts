// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const ipc = vi.hoisted(() => ({
  closeQuickChat: vi.fn(async () => {}),
  transferQuickChat: vi.fn(async () => {})
}))
vi.mock('@/lib/ipc', () => ipc)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

const { QuickChat } = await import('@/sub-apps/quick-chat/app')

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

const input = () => host.querySelector('input')!

function type(text: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!.call(input(), text)
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    input().dispatchEvent(
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
  for (const fn of Object.values(ipc)) fn.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(createElement(QuickChat)))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('quick chat', () => {
  it('starts with the input focused', () => {
    expect(document.activeElement).toBe(input())
  })

  it('Enter hands the trimmed text to the main window', () => {
    type('  what is 2+2  ')
    press('Enter')
    expect(ipc.transferQuickChat).toHaveBeenCalledWith('what is 2+2')
  })

  it('Enter on an empty box sends nothing', () => {
    press('Enter')
    expect(ipc.transferQuickChat).not.toHaveBeenCalled()
  })

  it('an Enter that confirms an IME composition is not a submit', () => {
    type('你好')
    press('Enter', { isComposing: true })
    expect(ipc.transferQuickChat).not.toHaveBeenCalled()
  })

  it('submits once even if Enter is pressed twice', () => {
    type('hello')
    press('Enter')
    press('Enter')
    expect(ipc.transferQuickChat).toHaveBeenCalledTimes(1)
  })

  it('Escape closes it', () => {
    press('Escape')
    expect(ipc.closeQuickChat).toHaveBeenCalledTimes(1)
  })

  it('closes when the window loses focus', () => {
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(ipc.closeQuickChat).toHaveBeenCalledTimes(1)
  })

  it('does not close on blur while a message is being handed over', () => {
    type('hello')
    press('Enter')
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(ipc.closeQuickChat).not.toHaveBeenCalled()
  })
})
