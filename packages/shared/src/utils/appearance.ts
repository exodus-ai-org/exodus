import {
  CUSTOM_PRESET_ID,
  DEFAULT_PRESET_ID,
  FONT_FAMILY_STACKS,
  FONT_WEIGHTS,
  findPreset,
  type SchemeColors,
  type SchemeSlot
} from '../constants/appearance'
import {
  AppearanceSchema,
  type Appearance,
  type AppearanceScheme,
  type ContentFontSetting,
  type FontSetting
} from '../schemas/settings-schema'
import {
  contrastingForeground,
  isHexColor,
  mix,
  normalizeHex,
  relativeLuminance
} from './color'

// ─── Scheme resolution ───────────────────────────────────────────────────────

export function resolveScheme(
  scheme: Partial<AppearanceScheme> | null | undefined,
  slot: SchemeSlot
): SchemeColors {
  const base = findPreset(scheme?.preset ?? DEFAULT_PRESET_ID)[slot]
  return {
    accent: scheme?.accent ?? base.accent,
    background: scheme?.background ?? base.background,
    foreground: scheme?.foreground ?? base.foreground
  }
}

/** True when the preset dropdown should read "Custom" (accent is its own axis). */
export function isSchemeCustomized(
  scheme: Partial<AppearanceScheme> | null | undefined
): boolean {
  if (!scheme) return false
  return (
    scheme.preset === CUSTOM_PRESET_ID ||
    (scheme.background !== null && scheme.background !== undefined) ||
    (scheme.foreground !== null && scheme.foreground !== undefined)
  )
}

// ─── Palette derivation ──────────────────────────────────────────────────────

export const PALETTE_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring'
] as const
export type PaletteToken = (typeof PALETTE_TOKENS)[number]
export type Palette = Record<PaletteToken, string>

// Mix ratios background → foreground (OKLab). Tuned so the Exodus preset at
// contrast 50 (k = 1) lands on the pre-appearance globals.css oklch tokens.
// Dark surfaces need larger steps than light ones to read as elevation.
interface Ramp {
  card: number
  /** secondary / muted / accent / sidebar-accent */
  surface: number
  border: number
  input: number
  mutedForeground: number
  ring: number
  sidebar: number
  chart: [number, number, number, number, number]
  destructive: string
}

const LIGHT_RAMP: Ramp = {
  card: 0,
  surface: 0.035,
  border: 0.091,
  input: 0.091,
  mutedForeground: 0.52,
  ring: 0.34,
  sidebar: 0.0175,
  chart: [0.152, 0.519, 0.656, 0.736, 0.855],
  destructive: '#e7000b'
}

const DARK_RAMP: Ramp = {
  card: 0.071,
  surface: 0.148,
  border: 0.12,
  input: 0.16,
  mutedForeground: 0.67,
  ring: 0.49,
  sidebar: 0.071,
  chart: [0.863, 0.489, 0.35, 0.269, 0.148],
  destructive: '#ff6467'
}

const DARK_LUMINANCE_THRESHOLD = 0.4

/** 0..100 → multiplier 0.5..1.5 applied to every surface/border ratio. */
function contrastFactor(contrast: number): number {
  const c = Number.isFinite(contrast)
    ? Math.min(100, Math.max(0, contrast))
    : 50
  return 0.5 + c / 100
}

export function derivePalette(colors: SchemeColors, contrast: number): Palette {
  const { background: bg, foreground: fg, accent } = colors
  const ramp =
    relativeLuminance(bg) < DARK_LUMINANCE_THRESHOLD ? DARK_RAMP : LIGHT_RAMP
  const k = contrastFactor(contrast)
  const step = (t: number) => mix(bg, fg, t * k)
  const card = step(ramp.card)
  const surface = step(ramp.surface)
  const border = step(ramp.border)
  const ring = mix(bg, fg, ramp.ring)
  const primaryForeground = contrastingForeground(accent, [bg, fg])
  return {
    background: bg,
    foreground: fg,
    card,
    'card-foreground': fg,
    popover: card,
    'popover-foreground': fg,
    primary: accent,
    'primary-foreground': primaryForeground,
    secondary: surface,
    'secondary-foreground': fg,
    muted: surface,
    'muted-foreground': step(ramp.mutedForeground),
    accent: surface,
    'accent-foreground': fg,
    destructive: ramp.destructive,
    border,
    input: step(ramp.input),
    ring,
    'chart-1': mix(bg, fg, ramp.chart[0]),
    'chart-2': mix(bg, fg, ramp.chart[1]),
    'chart-3': mix(bg, fg, ramp.chart[2]),
    'chart-4': mix(bg, fg, ramp.chart[3]),
    'chart-5': mix(bg, fg, ramp.chart[4]),
    sidebar: step(ramp.sidebar),
    'sidebar-foreground': fg,
    'sidebar-primary': accent,
    'sidebar-primary-foreground': primaryForeground,
    'sidebar-accent': surface,
    'sidebar-accent-foreground': fg,
    'sidebar-border': border,
    'sidebar-ring': ring
  }
}

// ─── Fonts ───────────────────────────────────────────────────────────────────

export function resolveFontFamily(
  setting: FontSetting | ContentFontSetting,
  ui?: FontSetting
): string {
  if (setting.family === 'ui') {
    return ui ? resolveFontFamily(ui) : FONT_FAMILY_STACKS.system
  }
  if (setting.family === 'custom') {
    const name = setting.customFamily?.trim().replaceAll(/["\\]/gu, '')
    return name
      ? `"${name}", ${FONT_FAMILY_STACKS.system}`
      : FONT_FAMILY_STACKS.system
  }
  return FONT_FAMILY_STACKS[setting.family]
}

// ─── Whole-appearance resolution ─────────────────────────────────────────────

export interface ResolvedFont {
  family: string
  weight: number
}

export interface ResolvedAppearance {
  light: Palette
  dark: Palette
  fonts: { ui: ResolvedFont; content: ResolvedFont }
  translucentSidebar: boolean
  contrast: number
}

/**
 * Parse a stored/cached value leniently: an invalid section falls back to its
 * default on its own, so one bad field never discards the whole theme.
 */
export function normalizeAppearance(raw: unknown): Appearance {
  const direct = AppearanceSchema.safeParse(raw ?? {})
  if (direct.success) return direct.data
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const salvaged: Record<string, unknown> = {}
  for (const key of Object.keys(AppearanceSchema.shape)) {
    if (AppearanceSchema.safeParse({ [key]: obj[key] }).success) {
      salvaged[key] = obj[key]
    }
  }
  return AppearanceSchema.parse(salvaged)
}

export function resolveAppearance(raw: unknown): ResolvedAppearance {
  const a = normalizeAppearance(raw)
  const uiWeight = FONT_WEIGHTS[a.uiFont.weight]
  return {
    light: derivePalette(resolveScheme(a.light, 'light'), a.contrast),
    dark: derivePalette(resolveScheme(a.dark, 'dark'), a.contrast),
    fonts: {
      ui: { family: resolveFontFamily(a.uiFont), weight: uiWeight },
      content: {
        family: resolveFontFamily(a.contentFont, a.uiFont),
        weight:
          a.contentFont.family === 'ui'
            ? uiWeight
            : FONT_WEIGHTS[a.contentFont.weight]
      }
    },
    translucentSidebar: a.translucentSidebar,
    contrast: a.contrast
  }
}

// ─── Import / export ─────────────────────────────────────────────────────────

export function exportScheme(colors: SchemeColors, name: string): string {
  return JSON.stringify(
    {
      name,
      accent: colors.accent,
      background: colors.background,
      foreground: colors.foreground
    },
    null,
    2
  )
}

export type SchemeImportResult =
  | { ok: true; colors: SchemeColors; name: string | null }
  | { ok: false }

export function parseSchemeImport(text: string): SchemeImportResult {
  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!doc || typeof doc !== 'object') return { ok: false }
  const o = doc as Record<string, unknown>
  const pick = (k: string): string | null => {
    const v = o[k]
    if (typeof v !== 'string') return null
    const hex = normalizeHex(v)
    return hex && isHexColor(hex) ? hex : null
  }
  const accent = pick('accent')
  const background = pick('background')
  const foreground = pick('foreground')
  if (!accent || !background || !foreground) return { ok: false }
  const name =
    typeof o.name === 'string' && o.name.trim() ? o.name.trim() : null
  return { ok: true, colors: { accent, background, foreground }, name }
}
