import { isLocaleId, type LanguageSetting } from '@shared/i18n/locales'
import { useEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { useSettings } from '@/hooks/use-settings'
import { i18n } from '@/lib/i18n'
import { setAppLocale } from '@/lib/ipc'

/**
 * Follows `settings.language` and keeps i18next, `<html lang>`, and the main
 * process in sync. Side-effect only, mounted inside `<I18nProvider>` — mirrors
 * `NativeThemeBridge` in `theme-provider.tsx`.
 *
 * For `"auto"` the effective id was already resolved by the main process and
 * handed over as `window.api.locale`; the renderer never re-runs the matcher.
 */
function LocaleBridge() {
  const { data: settings } = useSettings()
  const setting = settings?.language as LanguageSetting | null | undefined

  useEffect(() => {
    const next =
      setting && setting !== 'auto' && isLocaleId(setting)
        ? setting
        : (window.api?.locale ?? 'en')
    if (next === i18n.resolvedLanguage || next === i18n.language) return

    void i18n.changeLanguage(next)
    document.documentElement.lang = next
    document.documentElement.dir = 'ltr'
    void setAppLocale(next)
  }, [setting])

  return null
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LocaleBridge />
      {children}
    </I18nextProvider>
  )
}
