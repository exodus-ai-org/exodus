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
// `set-app-locale`'s handler rebuilds the menu bar via a dynamic import —
// stub it rather than pulling in menu.ts's own electron (Menu/BrowserWindow/
// shell) and lock-manager dependencies, none of which this file mocks.
vi.mock('@main/lib/menu', () => ({ setupMenu: vi.fn() }))

import { getSettings } from '@main/lib/db/queries'
import { setupMenu } from '@main/lib/menu'
import { ipcMain } from 'electron'

const { resolveEffectiveLocale, mainT, initMainI18n, getEffectiveLocale } =
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

describe('set-app-locale IPC handler', () => {
  function latestHandler() {
    const call = vi
      .mocked(ipcMain.handle)
      .mock.calls.findLast(([channel]) => channel === 'set-app-locale')
    if (!call) throw new Error('set-app-locale handler was never registered')
    return call[1] as (event: unknown, locale: unknown) => Promise<string>
  }

  it("resolves 'auto' through the OS languages rather than forcing English", async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    const handler = latestHandler()

    await handler(undefined, 'auto')

    expect(mainT('menu:file', 'WRONG_FALLBACK')).toBe('Fichier')
  })

  it('resolves an invalid/garbage value the same way as auto, not to en', async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    const handler = latestHandler()

    await handler(undefined, 'not-a-real-locale')

    expect(mainT('menu:file', 'WRONG_FALLBACK')).toBe('Fichier')
  })

  it('rebuilds the menu bar after a successful locale change', async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    const handler = latestHandler()
    vi.mocked(setupMenu).mockClear()

    await handler(undefined, 'de')

    expect(setupMenu).toHaveBeenCalledTimes(1)
  })

  it('is a no-op (does not rebuild the menu) when the locale is unchanged', async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'ja' } as never)
    await initMainI18n()
    const handler = latestHandler()
    vi.mocked(setupMenu).mockClear()

    await handler(undefined, 'ja')

    expect(setupMenu).not.toHaveBeenCalled()
  })

  it('returns the resolved locale (regression: LocaleBridge awaits this to apply auto correctly)', async () => {
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    const handler = latestHandler()

    await expect(handler(undefined, 'de')).resolves.toBe('de')
  })

  it('re-resolves auto fresh against the OS languages even right after switching away from it — never the stale prior explicit locale', async () => {
    // This is the exact regression a user hit: switch to an explicit
    // locale, then switch back to "Auto Detect" in the same session
    // (no app restart) — it must resolve fresh from the OS languages
    // ('fr', per this file's mocked getPreferredSystemLanguages), not
    // silently stick on the explicit locale that was set moments ago.
    vi.mocked(getSettings).mockResolvedValue({ language: 'en' } as never)
    await initMainI18n()
    const handler = latestHandler()

    await handler(undefined, 'ja')
    await expect(handler(undefined, 'auto')).resolves.toBe('fr')
    expect(getEffectiveLocale()).toBe('fr')
  })
})
