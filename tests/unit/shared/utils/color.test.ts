import {
  contrastRatio,
  contrastingForeground,
  formatHex,
  isHexColor,
  mix,
  normalizeHex,
  parseHex,
  relativeLuminance
} from '@exodus/shared/utils/color'
import { describe, expect, it } from 'vitest'

describe('hex parsing', () => {
  it('round-trips 6-digit hex in lowercase', () => {
    expect(formatHex(parseHex('#1F6FEB')!)).toBe('#1f6feb')
  })

  it('expands 3-digit hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc')
    expect(normalizeHex('ABC')).toBe('#aabbcc')
  })

  it('rejects garbage', () => {
    expect(parseHex('blue')).toBeNull()
    expect(normalizeHex('#12345')).toBeNull()
    expect(isHexColor('#12345g')).toBe(false)
    expect(isHexColor('#0d1117')).toBe(true)
  })
})

describe('mix', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(mix('#0a0a0a', '#fafafa', 0)).toBe('#0a0a0a')
    expect(mix('#0a0a0a', '#fafafa', 1)).toBe('#fafafa')
  })

  it('is monotonic in lightness', () => {
    const a = relativeLuminance(mix('#0a0a0a', '#fafafa', 0.25))
    const b = relativeLuminance(mix('#0a0a0a', '#fafafa', 0.5))
    const c = relativeLuminance(mix('#0a0a0a', '#fafafa', 0.75))
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  })

  it('clamps t', () => {
    expect(mix('#0a0a0a', '#fafafa', -1)).toBe('#0a0a0a')
    expect(mix('#0a0a0a', '#fafafa', 2)).toBe('#fafafa')
  })
})

describe('contrast', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it('luminance of white is 1 and black is 0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('prefers a preferred candidate that is legible, otherwise falls back', () => {
    expect(contrastingForeground('#171717', ['#ffffff', '#0a0a0a'])).toBe(
      '#ffffff'
    )
    // Everforest light accent: neither scheme colour reaches 4.5, black does.
    expect(contrastingForeground('#8da101', ['#fdf6e3', '#5c6a72'])).toBe(
      '#000000'
    )
  })
})
