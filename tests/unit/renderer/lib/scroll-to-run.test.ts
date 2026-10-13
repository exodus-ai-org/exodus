// @vitest-environment happy-dom
// A run is found by its question's anchor and scrolled to sit under the
// transcript's top, from the rail or from the header's panel.
import { describe, expect, it, vi } from 'vitest'

import {
  SCROLL_OFFSET,
  scrollRunIntoView,
  scrollToRun
} from '@/lib/scroll-to-run'

if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
  ;(globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s }
}

function transcript() {
  const container = document.createElement('div')
  container.setAttribute('data-chat-scroll', '')
  const run = document.createElement('div')
  run.setAttribute('data-user-msg-id', 'r2')
  container.append(run)
  document.body.append(container)
  container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect
  run.getBoundingClientRect = () => ({ top: 400 }) as DOMRect
  const scrollBy = vi.fn()
  container.scrollBy = scrollBy as unknown as HTMLElement['scrollBy']
  return { container, scrollBy }
}

describe('scrollRunIntoView', () => {
  it('scrolls the container so the question sits SCROLL_OFFSET under its top', () => {
    const { container, scrollBy } = transcript()
    expect(scrollRunIntoView(container, 'r2')).toBe(true)
    expect(scrollBy).toHaveBeenCalledWith({
      top: 400 - 100 - SCROLL_OFFSET,
      behavior: 'smooth'
    })
    container.remove()
  })

  it('is false for a run not on screen', () => {
    const { container, scrollBy } = transcript()
    expect(scrollRunIntoView(container, 'r9')).toBe(false)
    expect(scrollBy).not.toHaveBeenCalled()
    container.remove()
  })
})

describe('scrollToRun', () => {
  it("finds the open chat's transcript by its attribute", () => {
    const { container, scrollBy } = transcript()
    expect(scrollToRun('r2')).toBe(true)
    expect(scrollBy).toHaveBeenCalledTimes(1)
    container.remove()
    expect(scrollToRun('r2')).toBe(false)
  })
})
