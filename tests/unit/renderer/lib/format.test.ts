// src/renderer/lib/format.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeFormatters } from '@/lib/format'

describe('makeFormatters().list', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('joins titles the way the locale does', () => {
    expect(makeFormatters('en').list(['Work setup', 'Pets'])).toBe(
      'Work setup & Pets'
    )
    expect(makeFormatters('ja').list(['仕事', 'ペット', '音楽'])).toBe(
      '仕事、ペット、音楽'
    )
    expect(makeFormatters('zh-Hant-TW').list(['工作', '寵物'])).toBe(
      '工作和寵物'
    )
  })

  it('falls back to the app default for a locale it does not know', () => {
    expect(makeFormatters('xx').list(['A', 'B'])).toBe('A & B')
  })

  it('a single title is just that title', () => {
    expect(makeFormatters('en').list(['Pets'])).toBe('Pets')
  })

  it('joins with ", " where Intl.ListFormat is unavailable', () => {
    vi.stubGlobal('Intl', { ...Intl, ListFormat: undefined })
    expect(makeFormatters('ja').list(['A', 'B', 'C'])).toBe('A, B, C')
  })
})
