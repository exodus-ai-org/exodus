import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPreferredSystemLanguages: () => ['fr-CA', 'en-US'],
    getPath: () => '/tmp'
  },
  ipcMain: { on: vi.fn(), handle: vi.fn() }
}))
vi.mock('@main/lib/db/queries', () => ({ getSettings: vi.fn() }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

import { getSettings } from '@main/lib/db/queries'

const { resolveEffectiveLocale, mainT, initMainI18n } =
  await import('@main/lib/i18n')

describe('resolveEffectiveLocale', () => {
  it("'auto' resolves from the OS languages", () => {
    expect(resolveEffectiveLocale('auto')).toBe('fr')
  })
  it('an explicit id is used as-is', () => {
    expect(resolveEffectiveLocale('zh-Hant-TW')).toBe('zh-Hant-TW')
  })
  it('null falls back to auto-resolution', () => {
    expect(resolveEffectiveLocale(null)).toBe('fr')
  })
  it('garbage falls back to auto-resolution', () => {
    expect(resolveEffectiveLocale('nonsense' as never)).toBe('fr')
  })
})

describe('mainT', () => {
  it('falls back to the given English text when mainI18n is unset', () => {
    expect(mainT('menu:file', 'SENTINEL_ONLY_FROM_FALLBACK')).toBe(
      'SENTINEL_ONLY_FROM_FALLBACK'
    )
  })

  it('interpolates {{param}} into the fallback when mainI18n is unset', () => {
    expect(
      mainT(
        'menu:notification.philharmonicGroupError',
        'SENTINEL "{{title}}" FALLBACK',
        { title: 'Research' }
      )
    ).toBe('SENTINEL "Research" FALLBACK')
  })

  it('resolves a real translated value once mainI18n is initialized', async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    expect(mainT('menu:file', 'WRONG_FALLBACK_SHOULD_NOT_APPEAR')).toBe('File')
  })

  it('falls back to English when mainI18n is initialized but the key does not exist in the catalog', () => {
    expect(
      mainT(
        'menu:totallyMadeUpKeyThatDoesNotExist' as never,
        'FALLBACK_FOR_MISSING_KEY'
      )
    ).toBe('FALLBACK_FOR_MISSING_KEY')
  })
})
