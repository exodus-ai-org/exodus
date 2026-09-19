import { resolveAppearance } from '@exodus/shared/utils/appearance'
import { describe, expect, it } from 'vitest'

import { buildAppearanceCss } from '@/lib/appearance'

describe('buildAppearanceCss', () => {
  const css = buildAppearanceCss(
    resolveAppearance({
      dark: { preset: 'github' },
      uiFont: { family: 'mono', weight: 'medium' },
      contentFont: {
        family: 'custom',
        customFamily: 'Inter',
        weight: 'regular'
      }
    })
  )

  it('emits a :root block with the light tokens and a .dark block with the dark ones', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--background:\s*#ffffff/)
    expect(css).toMatch(/\.dark\s*\{[^}]*--background:\s*#0d1117/)
    expect(css).toMatch(/\.dark\s*\{[^}]*--primary:\s*#1f6feb/)
  })

  it('emits the font variables', () => {
    expect(css).toContain('--font-ui: ui-monospace')
    expect(css).toContain('--font-weight-base: 500')
    expect(css).toContain('--font-content: "Inter"')
    expect(css).toContain('--font-weight-content: 400')
  })

  it('covers every palette token in both blocks', () => {
    for (const token of ['sidebar-ring', 'chart-5', 'destructive']) {
      expect(css.split(`--${token}:`).length).toBe(3)
    }
  })

  it('is deterministic for the same input', () => {
    expect(buildAppearanceCss(resolveAppearance(null))).toBe(
      buildAppearanceCss(resolveAppearance(null))
    )
  })
})
