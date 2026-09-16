import { createI18n } from '@shared/i18n'
import {
  isLocaleId,
  resolveLocale,
  type LanguageSetting,
  type LocaleId
} from '@shared/i18n/locales'
import { MAIN_NAMESPACES } from '@shared/i18n/namespaces'
import { app, ipcMain } from 'electron'
import type { ParseKeys } from 'i18next'

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
 * `key` is typed against the real catalog via `ParseKeys`, so a typo is a
 * compile error; `mainI18n.exists(key)` additionally guards the (rarer)
 * runtime case where `mainI18n` is assigned but the key isn't actually
 * loaded in the resource bundle.
 */
export function mainT(
  key: ParseKeys<typeof MAIN_NAMESPACES>,
  fallback: string,
  params?: Record<string, string | number>
): string {
  if (mainI18n?.exists(key))
    return params ? mainI18n.t(key, params) : mainI18n.t(key)
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
      // Rebuilding the menu bar + tray on a live locale change is the
      // live-switch phase's job (not yet built) — the `menu` namespace
      // pass (this file's mainT()) deliberately stopped short of it.
      // buildContextMenu() (tray.ts) already re-reads mainT() on every
      // right-click, so the tray will pick up a runtime language change
      // once this lands; the menu bar (built once at boot via setupMenu())
      // will additionally need an explicit Menu.setApplicationMenu(buildMenu())
      // call added here.
    } catch (err) {
      logger.error('i18n', 'Failed to change main-process locale', {
        locale: next,
        error: String(err)
      })
    }
  })
}
