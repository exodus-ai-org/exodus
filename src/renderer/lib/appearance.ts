import { APPEARANCE_CACHE_KEY } from '@exodus/shared/constants/appearance'
import {
  PALETTE_TOKENS,
  resolveAppearance,
  type Palette,
  type ResolvedAppearance
} from '@exodus/shared/utils/appearance'

export const APPEARANCE_STYLE_ID = 'exodus-appearance'

function block(selector: string, palette: Palette): string {
  const lines = PALETTE_TOKENS.map((t) => `  --${t}: ${palette[t]};`)
  return `${selector} {\n${lines.join('\n')}\n}`
}

/**
 * The stylesheet that overrides globals.css's token defaults. Pure: the same
 * `ResolvedAppearance` always yields the same text, so a no-op re-apply is
 * cheap to detect.
 */
export function buildAppearanceCss(resolved: ResolvedAppearance): string {
  const fonts = [
    ':root {',
    `  --font-ui: ${resolved.fonts.ui.family};`,
    `  --font-weight-base: ${resolved.fonts.ui.weight};`,
    `  --font-content: ${resolved.fonts.content.family};`,
    `  --font-weight-content: ${resolved.fonts.content.weight};`,
    '}'
  ].join('\n')
  return [
    block(':root', resolved.light),
    block('.dark', resolved.dark),
    fonts
  ].join('\n\n')
}

export function isMacRenderer(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.electron?.process?.platform === 'darwin'
  )
}

/**
 * Upsert the `<style id=exodus-appearance>` at the END of <head> — after the
 * bundled globals.css, so equal-specificity `:root` / `.dark` rules win — and
 * mirror the translucency choice onto <html> for the CSS side.
 */
export function applyAppearance(resolved: ResolvedAppearance): void {
  if (typeof document === 'undefined') return
  const css = buildAppearanceCss(resolved)
  let el = document.getElementById(
    APPEARANCE_STYLE_ID
  ) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = APPEARANCE_STYLE_ID
    document.head.append(el)
  } else if (el !== document.head.lastElementChild) {
    // Vite may inject a stylesheet after us in dev; stay last.
    document.head.append(el)
  }
  if (el.textContent !== css) el.textContent = css
  // Only macOS has window vibrancy; elsewhere the sidebar is always opaque.
  document.documentElement.dataset.translucentSidebar = String(
    resolved.translucentSidebar && isMacRenderer()
  )
}

export function readAppearanceCache(): unknown {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeAppearanceCache(raw: unknown): void {
  try {
    if (raw == null) window.localStorage.removeItem(APPEARANCE_CACHE_KEY)
    else window.localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(raw))
  } catch {
    // Blocked storage: the provider still applies the live value.
  }
}

/** Synchronous first paint: cache → resolve → apply. Call before createRoot. */
export function bootAppearance(): void {
  applyAppearance(resolveAppearance(readAppearanceCache()))
}

/**
 * Sub-apps (search bar, quick chat, artifacts) don't fetch settings; they
 * follow what the main window writes to the shared same-origin localStorage.
 */
export function subscribeAppearanceCache(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === APPEARANCE_CACHE_KEY) cb()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
