import { describe, expect, it } from 'vitest'

import {
  back,
  canGoBack,
  canGoForward,
  current,
  EMPTY_HISTORY,
  forward,
  MAX_ENTRIES,
  pushed,
  without
} from '@/lib/route-history'

const visit = (...paths: string[]) => paths.reduce(pushed, EMPTY_HISTORY)

describe('route history', () => {
  it('starts at the first page with both arrows off', () => {
    const h = visit('/')
    expect(h).toEqual({ entries: ['/'], index: 0, skipNext: false })
    expect(canGoBack(h)).toBe(false)
    expect(canGoForward(h)).toBe(false)
  })

  it('goes back and forward along what was visited, marking the move for the recorder', () => {
    let h = visit('/', '/chat/a', '/chat/b')
    expect(canGoBack(h)).toBe(true)
    h = back(h)
    expect(current(h)).toBe('/chat/a')
    expect(h.skipNext).toBe(true)
    h = back(h)
    expect(current(h)).toBe('/')
    expect(canGoBack(h)).toBe(false)
    expect(back(h)).toBe(h)
    h = forward(h)
    expect(current(h)).toBe('/chat/a')
    expect(canGoForward(h)).toBe(true)
    expect(forward(forward(h))).toEqual(forward(h))
  })

  it('a new page after going back drops the forward branch', () => {
    const h = pushed(back(visit('/', '/chat/a', '/chat/b')), '/chat/c')
    expect(h.entries).toEqual(['/', '/chat/a', '/chat/c'])
    expect(h.index).toBe(2)
    expect(h.skipNext).toBe(false)
    expect(canGoForward(h)).toBe(false)
  })

  it('the same page twice in a row is one entry', () => {
    expect(visit('/', '/').entries).toEqual(['/'])
    expect(visit('/', '/chat/a', '/chat/a').entries).toEqual(['/', '/chat/a'])
  })

  it('keeps the newest 50 entries', () => {
    const h = visit(...Array.from({ length: 60 }, (_, i) => `/chat/${i}`))
    expect(h.entries).toHaveLength(MAX_ENTRIES)
    expect(h.entries[0]).toBe('/chat/10')
    expect(current(h)).toBe('/chat/59')
    expect(h.index).toBe(MAX_ENTRIES - 1)
  })

  it('a deleted chat leaves the stack and the index stays on the page in view', () => {
    const h = without(back(visit('/', '/chat/a', '/', '/chat/a')), '/chat/a')
    expect(h.entries).toEqual(['/'])
    expect(h.index).toBe(0)
  })

  it('deleting the chat on screen stays at the same depth, or as deep as is left', () => {
    const h = without(visit('/', '/chat/a'), '/chat/a')
    expect(h.entries).toEqual(['/'])
    expect(h.index).toBe(0)
    expect(canGoBack(h)).toBe(false)
    expect(without(visit('/chat/a'), '/chat/a')).toEqual(EMPTY_HISTORY)
  })

  it('collapses the duplicates a deletion creates', () => {
    const h = without(visit('/', '/chat/a', '/', '/chat/b'), '/chat/a')
    expect(h.entries).toEqual(['/', '/chat/b'])
    expect(h.index).toBe(1)
  })

  it('without a match is the same state', () => {
    const h = visit('/', '/chat/a')
    expect(without(h, '/chat/zzz')).toBe(h)
    expect(without(EMPTY_HISTORY, '/chat/a')).toBe(EMPTY_HISTORY)
  })
})
