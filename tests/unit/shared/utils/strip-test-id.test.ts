import { stripDataTestId } from '@shared/utils/strip-test-id'
import { describe, expect, it } from 'vitest'

describe('stripDataTestId', () => {
  it('removes a double-quoted literal attribute', () => {
    expect(stripDataTestId('<b data-testid="lock.unlock-button" />')).toBe(
      '<b />'
    )
  })

  it('removes a single-quoted literal attribute', () => {
    expect(stripDataTestId("<b data-testid='lock.pin' />")).toBe('<b />')
  })

  it('removes a plain expression attribute', () => {
    expect(stripDataTestId('<b data-testid={TEST_IDS.lock.unlock} />')).toBe(
      '<b />'
    )
  })

  it('removes a template-literal attribute with interpolations', () => {
    const src = '<b data-testid={`${TEST_IDS.settings.themeMode}-${value}`} />'
    expect(stripDataTestId(src)).toBe('<b />')
  })

  it('removes a ternary expression attribute', () => {
    const src = '<b data-testid={ok ? TEST_IDS.a : TEST_IDS.b} />'
    expect(stripDataTestId(src)).toBe('<b />')
  })

  it('leaves the surrounding JSX valid — the real generals.tsx shape', () => {
    const src = [
      '          <label',
      '            htmlFor={`appearance-mode-${value}`}',
      '            data-testid={`${TEST_IDS.settings.themeMode}-${value}`}',
      '            aria-label={label}',
      '          >'
    ].join('\n')
    const out = stripDataTestId(src)
    expect(out).not.toContain('data-testid')
    // the `htmlFor` template literal above the removed line is left intact
    expect(out).toContain('htmlFor={`appearance-mode-${value}`}')
    // no dangling template fragment from the removed line
    expect(out).not.toMatch(/`\}-\$\{value\}`\}/)
    expect(out).toContain('aria-label={label}')
  })

  it('does not touch other attributes that hold template literals', () => {
    const src = '<label htmlFor={`row-${id}`} className="x" />'
    expect(stripDataTestId(src)).toBe(src)
  })

  it('strips every occurrence in a file', () => {
    const src =
      'a data-testid="one" b data-testid={two} c data-testid={`${t}`} d'
    expect(stripDataTestId(src)).toBe('a b c d')
  })

  it('returns the input unchanged when there is nothing to strip', () => {
    const src = 'const x = { foo: "data-testid" } // not an attribute'
    expect(stripDataTestId(src)).toBe(src)
  })
})
