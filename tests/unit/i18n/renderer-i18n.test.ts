import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('window', { api: { locale: 'de' } })

const { i18n, i18nReady, getBootLocale } = await import('@/lib/i18n')

describe('renderer i18n singleton', () => {
  it('boots at window.api.locale', () => {
    expect(getBootLocale()).toBe('de')
  })
  it('initialises and falls back to en for empty catalogs', async () => {
    await i18nReady
    expect(i18n.isInitialized).toBe(true)
    // Phase 3 populated every real locale catalog, so there's no longer a
    // naturally-empty namespace to exercise the fallback chain with —
    // simulate one deliberately instead of relying on catalog completeness.
    i18n.removeResourceBundle('de', 'common')
    i18n.addResourceBundle('de', 'common', {}, false, true)
    expect(i18n.t('common:action.save')).toBe('Save')
  })
})
