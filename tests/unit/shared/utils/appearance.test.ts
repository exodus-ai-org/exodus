import {
  derivePalette,
  exportScheme,
  isSchemeCustomized,
  parseSchemeImport,
  resolveAppearance,
  resolveFontFamily,
  resolveScheme
} from '@exodus/shared/utils/appearance'
import { contrastRatio, relativeLuminance } from '@exodus/shared/utils/color'
import { describe, expect, it } from 'vitest'

const EXODUS_LIGHT = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  accent: '#171717'
}

describe('resolveScheme', () => {
  it('returns the preset colours when nothing is overridden', () => {
    expect(resolveScheme({ preset: 'github' }, 'dark')).toEqual({
      background: '#0d1117',
      foreground: '#e6edf3',
      accent: '#1f6feb'
    })
  })

  it('applies overrides on top of the preset', () => {
    expect(
      resolveScheme({ preset: 'github', accent: '#ff0000' }, 'dark').accent
    ).toBe('#ff0000')
  })

  it('falls back to Exodus for unknown presets, null and custom', () => {
    expect(resolveScheme({ preset: 'nope' }, 'light')).toEqual(EXODUS_LIGHT)
    expect(resolveScheme(null, 'light')).toEqual(EXODUS_LIGHT)
    expect(resolveScheme({ preset: 'custom' }, 'light')).toEqual(EXODUS_LIGHT)
  })

  it('reports customisation for custom preset or bg/fg overrides, not accent', () => {
    expect(isSchemeCustomized({ preset: 'github' })).toBe(false)
    expect(isSchemeCustomized({ preset: 'github', accent: '#000000' })).toBe(
      false
    )
    expect(
      isSchemeCustomized({ preset: 'github', background: '#000000' })
    ).toBe(true)
    expect(isSchemeCustomized({ preset: 'custom' })).toBe(true)
  })
})

describe('derivePalette', () => {
  it('reproduces the pre-appearance light tokens for Exodus at contrast 50', () => {
    const p = derivePalette(EXODUS_LIGHT, 50)
    expect(p.background).toBe('#ffffff')
    expect(p.foreground).toBe('#0a0a0a')
    expect(p.card).toBe('#ffffff')
    expect(p.primary).toBe('#171717')
    expect(p['primary-foreground']).toBe('#ffffff')
    expect(p.secondary).toBe('#f5f5f5')
    expect(p.muted).toBe('#f5f5f5')
    expect(p.accent).toBe('#f5f5f5')
    expect(p['muted-foreground']).toBe('#737373')
    expect(p.border).toBe('#e5e5e5')
    expect(p.ring).toBe('#a1a1a1')
    expect(p.sidebar).toBe('#fafafa')
    expect(p.destructive).toBe('#e7000b')
    expect(p['chart-2']).toBe('#737373')
  })

  it('reproduces the pre-appearance dark tokens for Exodus at contrast 50', () => {
    const p = derivePalette(
      { background: '#0a0a0a', foreground: '#fafafa', accent: '#e5e5e5' },
      50
    )
    expect(p.card).toBe('#171717')
    expect(p.secondary).toBe('#262626')
    expect(p['muted-foreground']).toBe('#a1a1a1')
    expect(p.ring).toBe('#737373')
    expect(p.sidebar).toBe('#171717')
    expect(p.destructive).toBe('#ff6467')
    expect(p['primary-foreground']).toBe('#0a0a0a')
  })

  it('higher contrast pushes borders and muted text away from the background', () => {
    const lo = derivePalette(EXODUS_LIGHT, 0)
    const hi = derivePalette(EXODUS_LIGHT, 100)
    expect(relativeLuminance(hi.border)).toBeLessThan(
      relativeLuminance(lo.border)
    )
    expect(contrastRatio(hi['muted-foreground'], '#ffffff')).toBeGreaterThan(
      contrastRatio(lo['muted-foreground'], '#ffffff')
    )
  })

  it('picks a legible primary-foreground for a saturated accent', () => {
    const p = derivePalette(
      { background: '#fdf6e3', foreground: '#5c6a72', accent: '#8da101' },
      50
    )
    expect(
      contrastRatio(p.primary, p['primary-foreground'])
    ).toBeGreaterThanOrEqual(4.5)
  })
})

describe('resolveFontFamily', () => {
  it('expands generic families and quotes a custom one', () => {
    expect(resolveFontFamily({ family: 'serif', weight: 'light' })).toMatch(
      /^ui-serif/
    )
    expect(
      resolveFontFamily({
        family: 'custom',
        customFamily: 'Inter',
        weight: 'light'
      })
    ).toMatch(/^"Inter", ui-sans-serif/)
  })

  it('falls back to system when custom has no name, and follows the UI font for content', () => {
    expect(resolveFontFamily({ family: 'custom', weight: 'light' })).toMatch(
      /^ui-sans-serif/
    )
    expect(
      resolveFontFamily(
        { family: 'ui', weight: 'light' },
        { family: 'mono', weight: 'light' }
      )
    ).toMatch(/^ui-monospace/)
  })
})

describe('resolveAppearance', () => {
  it('resolves null to the default look', () => {
    const r = resolveAppearance(null)
    expect(r.light.background).toBe('#ffffff')
    expect(r.dark.background).toBe('#0a0a0a')
    expect(r.fonts.ui.weight).toBe(300)
    expect(r.fonts.content.weight).toBe(300)
    expect(r.translucentSidebar).toBe(true)
    expect(r.contrast).toBe(50)
  })

  it('tolerates garbage by falling back to defaults', () => {
    expect(resolveAppearance({ contrast: 'x', light: 5 }).contrast).toBe(50)
    expect(resolveAppearance('nonsense').light.background).toBe('#ffffff')
  })

  it('keeps the valid sections of a partially broken value', () => {
    const r = resolveAppearance({ contrast: 'x', dark: { preset: 'github' } })
    expect(r.dark.background).toBe('#0d1117')
    expect(r.contrast).toBe(50)
  })

  it('content weight follows the UI weight while family is ui', () => {
    const r = resolveAppearance({
      uiFont: { weight: 'medium' },
      contentFont: { family: 'ui', weight: 'light' }
    })
    expect(r.fonts.content.weight).toBe(500)
  })
})

describe('import / export', () => {
  it('round-trips', () => {
    const text = exportScheme(EXODUS_LIGHT, 'Exodus')
    const parsed = parseSchemeImport(text)
    expect(parsed).toEqual({ ok: true, colors: EXODUS_LIGHT, name: 'Exodus' })
  })

  it('normalises hex case and rejects incomplete or invalid documents', () => {
    expect(
      parseSchemeImport(
        '{"accent":"#1F6FEB","background":"#0D1117","foreground":"#E6EDF3"}'
      )
    ).toEqual({
      ok: true,
      colors: {
        accent: '#1f6feb',
        background: '#0d1117',
        foreground: '#e6edf3'
      },
      name: null
    })
    expect(parseSchemeImport('not json').ok).toBe(false)
    expect(parseSchemeImport('{"accent":"#1F6FEB"}').ok).toBe(false)
    expect(
      parseSchemeImport(
        '{"accent":"red","background":"#000000","foreground":"#ffffff"}'
      ).ok
    ).toBe(false)
  })
})
