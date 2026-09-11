import { createI18n } from '@shared/i18n'
import {
  isLocaleId,
  resolveLocale,
  type LanguageSetting,
  type LocaleId
} from '@shared/i18n/locales'
import { app, ipcMain } from 'electron'

import { getSettings } from './db/queries'
import { logger } from './logger'

export let mainI18n: import('i18next').i18n

let effective: LocaleId = 'en'
export const getEffectiveLocale = (): LocaleId => effective

/**
 * Resolve the locale the app should actually run in.
 * A concrete locale id in settings wins; `'auto'` / null / anything else
 * defers to the OS's preferred languages.
 */
export function resolveEffectiveLocale(
  setting: LanguageSetting | null | undefined
): LocaleId {
  if (setting && setting !== 'auto' && isLocaleId(setting)) return setting
  return resolveLocale(app.getPreferredSystemLanguages())
}

export async function initMainI18n(): Promise<void> {
  const settings = await getSettings()
  effective = resolveEffectiveLocale(
    settings.language as LanguageSetting | null | undefined
  )

  const { i18n, ready } = createI18n(effective, { isRenderer: false })
  mainI18n = i18n
  await ready
  logger.info('i18n', 'main i18n ready', { locale: effective })

  ipcMain.on('get-app-locale', (event) => {
    event.returnValue = effective
  })

  ipcMain.handle('set-app-locale', async (_event, locale: unknown) => {
    const next = isLocaleId(locale) ? locale : 'en'
    if (next === effective) return
    try {
      await mainI18n.changeLanguage(next)
      effective = next
      logger.info('i18n', 'main locale changed', { locale: next })
      // Menu/tray rebuild on locale change lands with the `menu` namespace
      // extraction (Phase 2 / Phase 4) — not this phase.
    } catch (err) {
      logger.error('i18n', 'Failed to change main-process locale', {
        locale: next,
        error: String(err)
      })
    }
  })
}
