import {
  CUSTOM_PRESET_ID,
  DEFAULT_PRESET_ID,
  FONT_FAMILY_STACKS,
  FONT_WEIGHTS,
  NAMED_ACCENTS,
  THEME_PRESETS
} from '@exodus/shared/constants/appearance'
import { contrastRatio } from '@exodus/shared/utils/color'
import { describe, expect, it } from 'vitest'

const HEX = /^#[0-9a-f]{6}$/u

describe('THEME_PRESETS', () => {
  it('has unique ids, none of them the custom sentinel, and includes the default', () => {
    const ids = THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain(CUSTOM_PRESET_ID)
    expect(ids).toContain(DEFAULT_PRESET_ID)
  })

  it('uses lowercase 6-digit hex everywhere', () => {
    for (const p of THEME_PRESETS) {
      for (const slot of ['light', 'dark'] as const) {
        for (const c of Object.values(p[slot])) expect(c).toMatch(HEX)
      }
    }
  })

  it('every preset is legible (WCAG AA) in both schemes', () => {
    for (const p of THEME_PRESETS) {
      for (const slot of ['light', 'dark'] as const) {
        const { background, foreground } = p[slot]
        expect(
          contrastRatio(foreground, background),
          `${p.id}/${slot}`
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('the Exodus preset reproduces the pre-appearance globals.css tokens', () => {
    const exodus = THEME_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!
    expect(exodus.light).toEqual({
      background: '#ffffff',
      foreground: '#0a0a0a',
      accent: '#171717'
    })
    expect(exodus.dark).toEqual({
      background: '#0a0a0a',
      foreground: '#fafafa',
      accent: '#e5e5e5'
    })
  })
})

describe('NAMED_ACCENTS / fonts', () => {
  it('named accents are valid hex in both slots', () => {
    for (const a of NAMED_ACCENTS) {
      expect(a.light).toMatch(HEX)
      expect(a.dark).toMatch(HEX)
    }
  })

  it('weights map to CSS numbers', () => {
    expect(FONT_WEIGHTS).toEqual({ light: 300, regular: 400, medium: 500 })
  })

  it('every generic family stack ends in a CSS generic keyword', () => {
    expect(FONT_FAMILY_STACKS.system).toMatch(/sans-serif/)
    expect(FONT_FAMILY_STACKS.serif).toMatch(/serif$/)
    expect(FONT_FAMILY_STACKS.mono).toMatch(/monospace$/)
    expect(FONT_FAMILY_STACKS.rounded).toMatch(/sans-serif$/)
  })
})
