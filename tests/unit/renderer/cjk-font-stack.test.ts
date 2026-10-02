// CJK text gets one named face, never a per-run system fallback: without
// one, Chromium drew a Simplified-only run in Hiragino Sans GB and the next
// run in Hiragino Kaku Gothic, so paragraphs of an answer differed in size and
// composer text changed face as a character joined it. Measured in Chromium
// with CDP `CSS.getPlatformFontsForNode` (see the commit that added this).
import { readFileSync } from 'fs'
import { join, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')
const css = readFileSync(
  join(ROOT, 'src/renderer/assets/stylesheets/globals.css'),
  'utf8'
)

const declared = (name: string, selector = '') => {
  const scope = selector ? css.slice(css.indexOf(`${selector} {`)) : css
  const m = scope.match(new RegExp(`${name}:\\s*([^;]+);`, 'u'))
  if (!m) throw new Error(`no ${name} in ${selector || 'the sheet'}`)
  return m[1].replaceAll(/\s+/gu, ' ')
}

describe('the app font stacks', () => {
  it('name the CJK face after the Latin faces and before the generic family', () => {
    const sans = declared('--font-sans')
    expect(sans.startsWith('-apple-system,')).toBe(true)
    expect(sans.indexOf('Arial')).toBeLessThan(sans.indexOf('var(--font-cjk)'))
    expect(sans.indexOf('var(--font-cjk)')).toBeLessThan(
      sans.lastIndexOf('sans-serif')
    )
    const mono = declared('--font-mono')
    expect(mono.indexOf('var(--font-cjk)')).toBeLessThan(
      mono.lastIndexOf('monospace')
    )
  })

  it('default to Simplified Chinese, regional by the UI language', () => {
    expect(declared('--font-cjk', 'html')).toMatch(/^'Exodus CJK SC'/u)
    expect(declared('--font-cjk', 'html:lang(zh-Hant-TW)')).toMatch(
      /^'Exodus CJK TC'/u
    )
    expect(declared('--font-cjk', 'html:lang(zh-Hant-HK)')).toMatch(
      /^'Exodus CJK HK'/u
    )
    expect(declared('--font-cjk', 'html:lang(ja)')).toMatch(/^'Hiragino Sans'/u)
    expect(declared('--font-cjk', 'html:lang(ko)')).toMatch(
      /^'Apple SD Gothic Neo'/u
    )
  })

  it('map every weight band of the PingFang faces', () => {
    for (const region of ['SC', 'TC', 'HK']) {
      for (const face of ['Light', 'Regular', 'Medium', 'Semibold']) {
        expect(css).toContain(`local('PingFang${region}-${face}')`)
      }
    }
  })
})
