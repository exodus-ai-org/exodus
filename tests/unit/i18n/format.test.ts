import { describe, expect, it } from 'vitest'

import { makeFormatters } from '@/lib/format'

describe('makeFormatters', () => {
  const d = new Date('2026-01-15T12:00:00Z')

  it('formats numbers per locale', () => {
    expect(makeFormatters('en').number(1234567.5)).toBe('1,234,567.5')
    expect(makeFormatters('de').number(1234567.5)).toBe('1.234.567,5')
    // French grouping separator varies by ICU version (regular space, NBSP,
    // or narrow NBSP) -- \s matches all Unicode space separators, so
    // normalize to a plain space before comparing.
    expect(makeFormatters('fr').number(1234567.5).replace(/\s/g, ' ')).toBe(
      '1 234 567,5'
    )
  })

  it('formats dates per locale', () => {
    expect(
      makeFormatters('en').dateTime(d, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    ).toMatch(/Jan.*15.*2026/)
    expect(
      makeFormatters('ja').dateTime(d, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    ).toContain('2026年')
  })

  it('relativeTime returns a localized string', () => {
    const past = new Date(Date.now() - 3 * 3600_000)
    expect(makeFormatters('en').relativeTime(past)).toMatch(/hours? ago/)
    expect(makeFormatters('de').relativeTime(past)).toMatch(/vor /)
  })

  it('falls back to en for an unknown locale id', () => {
    expect(makeFormatters('xx').number(1000)).toBe('1,000')
  })
})
