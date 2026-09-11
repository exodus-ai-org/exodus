import i18next, { type i18n as I18nInstance } from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'

import { FALLBACK_LNG } from './locales'
import { MAIN_NAMESPACES, NAMESPACES } from './namespaces'

// Vite (all three electron-vite targets) turns this template dynamic import
// into a glob over ./locales/*/*.json and code-splits each locale.
const backend = resourcesToBackend(
  (lng: string, ns: string) => import(`./locales/${lng}/${ns}.json`)
)

export function createI18n(
  lng: string,
  { isRenderer }: { isRenderer: boolean }
): { i18n: I18nInstance; ready: Promise<unknown> } {
  const instance = i18next.createInstance()
  const configured = isRenderer
    ? instance.use(initReactI18next).use(backend)
    : instance.use(backend)

  const ready = configured.init({
    lng,
    fallbackLng: FALLBACK_LNG as unknown as Record<string, string[]>,
    ns: (isRenderer ? NAMESPACES : MAIN_NAMESPACES) as unknown as string[],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false }
  })

  return { i18n: instance, ready }
}
