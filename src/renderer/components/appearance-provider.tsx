import { resolveAppearance } from '@exodus/shared/utils/appearance'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

import { useSettings } from '@/hooks/use-settings'
import { applyAppearance, writeAppearanceCache } from '@/lib/appearance'
import { setWindowTranslucency } from '@/lib/ipc'

/**
 * Follows `settings.appearance` and keeps the injected token stylesheet, the
 * boot cache and the window's vibrancy in sync. Side-effect only — mirrors
 * `LocaleBridge` / `NativeThemeBridge`. `bootAppearance()` already applied
 * the cached value before React mounted, so this only changes something when
 * the setting itself (or the resolved light/dark mode) changed.
 */
export function AppearanceProvider() {
  const { data: settings } = useSettings()
  const { resolvedTheme } = useTheme()
  const raw = settings?.appearance
  const loaded = settings !== undefined

  useEffect(() => {
    if (!loaded) return
    const resolved = resolveAppearance(raw ?? null)
    applyAppearance(resolved)
    writeAppearanceCache(raw ?? null)
    if (typeof window === 'undefined' || !window.electron) return
    const palette = resolvedTheme === 'dark' ? resolved.dark : resolved.light
    setWindowTranslucency(
      resolved.translucentSidebar,
      palette.background
    ).catch((err) => {
      console.error('[appearance] failed to update window translucency', err)
    })
  }, [raw, loaded, resolvedTheme])

  return null
}
