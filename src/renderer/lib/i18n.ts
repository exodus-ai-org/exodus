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

const bootLocale = getBootLocale()
// `<LocaleBridge>` sets `lang` only when the language changes: at boot the
// page had none, and `lang` picks the regional CJK face (globals.css).
if (typeof document !== 'undefined') document.documentElement.lang = bootLocale

const created = createI18n(bootLocale, { isRenderer: true })
export const i18n = created.i18n
export const i18nReady = created.ready
