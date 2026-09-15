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
 * Safely translates a main-process string, tolerating `mainI18n` being
 * unassigned — `initMainI18n()` can fail during boot (see its `.catch()` in
 * `index.ts`), and boot continues in English rather than crashing. `fallback`
 * must be the exact same English text as the catalog's value for `key`, so
 * the two paths render identically. When `mainI18n` isn't ready, a
 * lightweight `{{param}}` substitution (the same pattern `AppError.interpolate`
 * uses for the `errors` namespace) keeps interpolated content correct even
 * without i18next.
 */
export function mainT(
  key: string,
  fallback: string,
  params?: Record<string, string | number>
): string {
  if (mainI18n)
    return params ? mainI18n.t(key as never, params) : mainI18n.t(key as never)
  if (!params) return fallback
  return fallback.replace(/\{\{(\w+)\}\}/g, (match, k: string) =>
    k in params ? String(params[k]) : match
  )
}

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
