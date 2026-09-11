import { createI18n } from '@shared/i18n'
import { describe, expect, it } from 'vitest'

describe('createI18n', () => {
  it('loads the active locale and returns a real string', async () => {
    const { i18n, ready } = createI18n('en', { isRenderer: false })
    await ready
    expect(i18n.t('common:action.save')).toBe('Save')
    expect(i18n.t('errors:somethingWentWrong')).toContain('went wrong')
  })

  it('falls back to en for a missing key without throwing', async () => {
    const { i18n, ready } = createI18n('ja', { isRenderer: false })
    await ready
    // ja/common.json is {} in Phase 1 -> resolves through fallbackLng
    expect(i18n.t('common:action.cancel')).toBe('Cancel')
  })

  it('resolves zh-Hant-HK through zh-Hant-TW before falling to en', async () => {
    const { i18n, ready } = createI18n('zh-Hant-HK', { isRenderer: false })
    await ready
    // Inject a TW-only value absent from en and zh-Hant-HK — if the fallback
    // chain skips TW and goes straight to en, this assertion fails.
    i18n.addResourceBundle('zh-Hant-TW', 'common', {
      action: { save: '儲存' }
    })
    expect(i18n.t('common:action.save')).toBe('儲存')
  })

  it('renderer mode initialises without throwing', async () => {
    const { i18n, ready } = createI18n('fr', { isRenderer: true })
    await ready
    expect(i18n.isInitialized).toBe(true)
  })
})
