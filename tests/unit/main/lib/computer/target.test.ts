import {
  refreshBounds,
  resolveTarget,
  TargetNotFound,
  WindowGone
} from '@main/lib/computer/target'
import type { InputHelper, TargetWindow } from '@main/lib/computer/types'
import { describe, expect, it } from 'vitest'

// target.ts only needs `listWindows()`; the other `InputHelper` members are
// stubbed so the object type-checks without pulling in `helper.ts` (electron).
function makeHelper(windows: TargetWindow[]): InputHelper {
  return {
    listWindows: async () => windows,
    screenshot: async () => Buffer.alloc(0),
    send: async () => {}
  }
}

const chess: TargetWindow = {
  cgWindowId: 1,
  app: 'Chess',
  bundleId: 'com.apple.Chess',
  title: 'Chess',
  bounds: [0, 0, 800, 600]
}

const chrome: TargetWindow = {
  cgWindowId: 2,
  app: 'Google Chrome',
  bundleId: 'com.google.Chrome',
  title: 'New Tab',
  bounds: [100, 100, 1200, 900]
}

describe('resolveTarget', () => {
  it('matches by app substring, case-insensitively', async () => {
    const t = await resolveTarget('chess', makeHelper([chrome, chess]))
    expect(t.cgWindowId).toBe(1)
  })

  it('matches by bundleId substring', async () => {
    const t = await resolveTarget('apple.chess', makeHelper([chrome, chess]))
    expect(t.cgWindowId).toBe(1)
  })

  it('prefers a titled candidate over a larger untitled one', async () => {
    const titled: TargetWindow = {
      cgWindowId: 10,
      app: 'Notes',
      bundleId: 'com.apple.Notes',
      title: 'Groceries',
      bounds: [0, 0, 400, 300]
    }
    const untitledBigger: TargetWindow = {
      cgWindowId: 11,
      app: 'Notes',
      bundleId: 'com.apple.Notes',
      title: '',
      bounds: [0, 0, 2000, 1500]
    }
    const t = await resolveTarget('notes', makeHelper([untitledBigger, titled]))
    expect(t.cgWindowId).toBe(10)
  })

  it('breaks a title tie by larger screen area', async () => {
    const small: TargetWindow = {
      cgWindowId: 20,
      app: 'Safari',
      bundleId: 'com.apple.Safari',
      title: 'A',
      bounds: [0, 0, 400, 300]
    }
    const big: TargetWindow = {
      cgWindowId: 21,
      app: 'Safari',
      bundleId: 'com.apple.Safari',
      title: 'B',
      bounds: [0, 0, 1000, 800]
    }
    const t = await resolveTarget('safari', makeHelper([small, big]))
    expect(t.cgWindowId).toBe(21)
  })

  it('throws TargetNotFound when nothing matches', async () => {
    await expect(
      resolveTarget('doesnotexist', makeHelper([chess, chrome]))
    ).rejects.toThrow(TargetNotFound)
  })

  it('TargetNotFound carries the right name and the query in its message', async () => {
    const err = await resolveTarget('zzz', makeHelper([chess])).catch(
      (e) => e as Error
    )
    expect(err).toBeInstanceOf(TargetNotFound)
    expect(err.name).toBe('TargetNotFound')
    expect(err.message).toContain('zzz')
  })
})

describe('refreshBounds', () => {
  const target: TargetWindow = {
    cgWindowId: 7,
    app: 'Chess',
    bundleId: 'com.apple.Chess',
    title: 'Chess',
    bounds: [0, 0, 800, 600]
  }

  it('returns a fresh object with updated bounds + title, same identity', async () => {
    const moved: TargetWindow = {
      ...target,
      title: 'Chess — Game 2',
      bounds: [40, 60, 820, 640]
    }
    const out = await refreshBounds(target, makeHelper([moved]))
    expect(out).not.toBe(target)
    expect(out.cgWindowId).toBe(7)
    expect(out.app).toBe('Chess')
    expect(out.bundleId).toBe('com.apple.Chess')
    expect(out.bounds).toEqual([40, 60, 820, 640])
    expect(out.title).toBe('Chess — Game 2')
  })

  it('keeps app/bundleId from t, taking only bounds + title from the helper', async () => {
    const weird: TargetWindow = {
      cgWindowId: 7,
      app: 'X',
      bundleId: 'y',
      title: 'T',
      bounds: [1, 2, 3, 4]
    }
    const out = await refreshBounds(target, makeHelper([weird]))
    expect(out.app).toBe('Chess')
    expect(out.bundleId).toBe('com.apple.Chess')
    expect(out.bounds).toEqual([1, 2, 3, 4])
    expect(out.title).toBe('T')
  })

  it('throws WindowGone when the id is no longer listed', async () => {
    const err = await refreshBounds(target, makeHelper([])).catch(
      (e) => e as Error
    )
    expect(err).toBeInstanceOf(WindowGone)
    expect(err.name).toBe('WindowGone')
    expect(err.message).toContain('7')
  })
})
