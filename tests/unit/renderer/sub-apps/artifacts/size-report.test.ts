import { describe, expect, it, vi } from 'vitest'

import {
  measure,
  observeSize,
  sizeMessage
} from '@/sub-apps/artifacts/size-report'

function element(height: number, scrollHeight = height) {
  return {
    getBoundingClientRect: () => ({ height }),
    scrollHeight
  } as unknown as Element & { scrollHeight: number }
}

class FakeObserver {
  static last: FakeObserver | null = null
  observed: Element[] = []
  disconnected = false
  constructor(public callback: () => void) {
    FakeObserver.last = this
  }
  observe(target: Element) {
    this.observed.push(target)
  }
  disconnect() {
    this.disconnected = true
  }
}

describe('artifact sandbox size report', () => {
  it('rounds the height up to whole pixels, and refuses what is not a height', () => {
    expect(sizeMessage(312.2)).toEqual({
      type: 'artifact-sandbox-size',
      height: 313
    })
    expect(sizeMessage(0)).toEqual({
      type: 'artifact-sandbox-size',
      height: 0
    })
    expect(sizeMessage(-1)).toBeNull()
    expect(sizeMessage(Number.NaN)).toBeNull()
    expect(sizeMessage(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('measures what overflows the root too', () => {
    expect(measure(element(100, 140))).toBe(140)
    expect(measure(element(100.5, 100))).toBe(100.5)
  })

  it('posts a change once, and a report always', () => {
    const root = element(200)
    const post = vi.fn()
    const size = observeSize(
      root,
      post,
      FakeObserver as unknown as typeof ResizeObserver
    )
    const observer = FakeObserver.last!
    expect(observer.observed).toEqual([root])

    observer.callback()
    observer.callback()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenLastCalledWith({
      type: 'artifact-sandbox-size',
      height: 200
    })

    size.report()
    expect(post).toHaveBeenCalledTimes(2)

    ;(root as { scrollHeight: number }).scrollHeight = 260
    observer.callback()
    expect(post).toHaveBeenLastCalledWith({
      type: 'artifact-sandbox-size',
      height: 260
    })

    size.disconnect()
    expect(observer.disconnected).toBe(true)
  })

  it('still reports after a render where there is no ResizeObserver', () => {
    const post = vi.fn()
    const size = observeSize(element(80), post, null)
    size.report()
    expect(post).toHaveBeenCalledWith({
      type: 'artifact-sandbox-size',
      height: 80
    })
  })
})
