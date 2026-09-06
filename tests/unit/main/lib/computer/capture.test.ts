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
  it('halves a 2800x1750 window so the long edge hits MAX_EDGE', () => {
    expect(computeScale(2800, 1750)).toEqual({
      width: 1400,
      height: 875,
      scaleFactor: 0.5
    })
  })

  it('leaves a window smaller than MAX_EDGE untouched (scaleFactor 1)', () => {
    expect(computeScale(1000, 800)).toEqual({
      width: 1000,
      height: 800,
      scaleFactor: 1
    })
  })

  it('does not resize when the long edge is exactly MAX_EDGE (boundary)', () => {
    expect(computeScale(1400, 900)).toEqual({
      width: 1400,
      height: 900,
      scaleFactor: 1
    })
  })

  it('scales by the longer edge for a portrait window', () => {
    const r = computeScale(900, 2100)
    expect(r.height).toBe(1400)
    expect(r.width).toBe(600)
    expect(r.scaleFactor).toBeCloseTo(2 / 3, 6)
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
  const target: TargetWindow = {
    cgWindowId: 7,
    app: 'Chess',
    bundleId: 'com.apple.Chess',
    title: 'Chess',
    bounds: [0, 0, 2800, 1750]
  }
  const fakeHelper: InputHelper = {
    listWindows: async () => [],
    screenshot: async () => Buffer.from('raw-png-bytes'),
    send: async () => {}
  }

  it('downscales a 2800px capture and reports scaleFactor 0.5', async () => {
    const { shot, scaleFactor } = await screenshotWindow(target, fakeHelper)
    expect(scaleFactor).toBe(0.5)
    expect(shot).toEqual({
      data: Buffer.from('RESIZED-PNG').toString('base64'),
      mimeType: 'image/png',
      width: 1400,
      height: 875
    })
  })
})
