import { createI18n } from '@exodus/shared/i18n'
import { isLocaleId } from '@exodus/shared/i18n/locales'

export function getBootLocale(): string {
  const q = new URLSearchParams(
    typeof location !== 'undefined' ? location.search : ''
  ).get('locale')
  if (isLocaleId(q)) return q
  const w = typeof window !== 'undefined' ? window.api?.locale : undefined
  return isLocaleId(w) ? w : 'en'
}

const created = createI18n(getBootLocale(), { isRenderer: true })
export const i18n = created.i18n
export const i18nReady = created.ready
