import type { InputHelper, TargetWindow } from '@main/lib/computer/types'
import { describe, expect, it, vi } from 'vitest'

// capture.ts imports `nativeImage` from electron at module load. The pure
// exports (`computeScale`, `hashPng`) never touch it; the one `screenshotWindow`
// test below drives this fake through the resize path.
vi.mock('electron', () => ({
  nativeImage: {
    createFromBuffer: () => ({
      getSize: () => ({ width: 2800, height: 1750 }),
      resize: () => ({ toPNG: () => Buffer.from('RESIZED-PNG') }),
      toPNG: () => Buffer.from('ORIGINAL-PNG')
    })
  }
}))

const { computeScale, hashPng, screenshotWindow, MAX_EDGE } =
  await import('@main/lib/computer/capture')

describe('computeScale', () => {
  it('halves a 2800x1750 capture so the long edge hits MAX_EDGE', () => {
    expect(computeScale(2800, 1750)).toEqual({ width: 1400, height: 875 })
  })

  it('leaves a capture smaller than MAX_EDGE untouched', () => {
    expect(computeScale(1000, 800)).toEqual({ width: 1000, height: 800 })
  })

  it('does not resize when the long edge is exactly MAX_EDGE (boundary)', () => {
    expect(computeScale(1400, 900)).toEqual({ width: 1400, height: 900 })
  })

  it('scales by the longer edge for a portrait capture', () => {
    const r = computeScale(900, 2100)
    expect(r.height).toBe(1400)
    expect(r.width).toBe(600)
  })

  it('exposes MAX_EDGE as 1400', () => {
    expect(MAX_EDGE).toBe(1400)
  })
})

describe('hashPng', () => {
  it('is stable for identical input', () => {
    expect(hashPng('AAAA')).toBe(hashPng('AAAA'))
  })

  it('differs when a single character changes', () => {
    expect(hashPng('AAAA')).not.toBe(hashPng('AAAB'))
  })

  it('returns a hex string', () => {
    expect(hashPng('AAAA')).toMatch(/^[0-9a-f]+$/)
  })
})

describe('screenshotWindow', () => {
  // The mock always captures 2800x1750 and resizes to 1400x875; only
  // `target.bounds` (window points) varies, so `scaleFactor` = 1400 / bounds.w.
  const base: Omit<TargetWindow, 'bounds'> = {
    cgWindowId: 7,
    app: 'Chess',
    bundleId: 'com.apple.Chess',
    title: 'Chess'
  }
  const fakeHelper: InputHelper = {
    listWindows: async () => [],
    screenshot: async () => Buffer.from('raw-png-bytes'),
    send: async () => {}
  }
  const resizedShot = {
    data: Buffer.from('RESIZED-PNG').toString('base64'),
    mimeType: 'image/png' as const,
    width: 1400,
    height: 875
  }

  it('reports scaleFactor 1 when the screenshot pixels line up with window points', async () => {
    // 1400-pt window on a 2x display → 2800 px capture → 1400 px screenshot
    const { shot, scaleFactor } = await screenshotWindow(
      { ...base, bounds: [0, 0, 1400, 875] },
      fakeHelper
    )
    expect(scaleFactor).toBe(1)
    expect(shot).toEqual(resizedShot)
  })

  it('reports scaleFactor 0.5 for a downscaled large window on a 1x display', async () => {
    // 2800-pt window on a 1x display → 2800 px capture → 1400 px screenshot
    const { shot, scaleFactor } = await screenshotWindow(
      { ...base, bounds: [0, 0, 2800, 1750] },
      fakeHelper
    )
    expect(scaleFactor).toBe(0.5)
    expect(shot).toEqual(resizedShot)
  })
})
