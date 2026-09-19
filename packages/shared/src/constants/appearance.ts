export type SchemeSlot = 'light' | 'dark'

export interface SchemeColors {
  accent: string
  background: string
  foreground: string
}

export interface ThemePreset {
  id: string
  /** Proper noun — never translated. */
  name: string
  light: SchemeColors
  dark: SchemeColors
}

export const DEFAULT_PRESET_ID = 'exodus'
/** `AppearanceScheme.preset` after an import: no preset is the base. */
export const CUSTOM_PRESET_ID = 'custom'
/** localStorage key holding the raw `Appearance` value for flash-free boot. */
export const APPEARANCE_CACHE_KEY = 'exodus-appearance'

// Hex values are the canonical palettes' own numbers (GitHub Primer, Catppuccin
// Latte/Mocha, Dracula/Alucard, Gruvbox, Nord, Solarized, Everforest, Ayu
// Light/Mirage, Tokyo Night Day/Night, One Light/Dark, Rosé Pine Dawn/Main).
// `exodus` is the pre-appearance globals.css look (Tailwind neutral scale).
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'exodus',
    name: 'Exodus',
    light: { background: '#ffffff', foreground: '#0a0a0a', accent: '#171717' },
    dark: { background: '#0a0a0a', foreground: '#fafafa', accent: '#e5e5e5' }
  },
  {
    id: 'github',
    name: 'GitHub',
    light: { background: '#ffffff', foreground: '#1f2328', accent: '#0969da' },
    dark: { background: '#0d1117', foreground: '#e6edf3', accent: '#1f6feb' }
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    light: { background: '#eff1f5', foreground: '#4c4f69', accent: '#1e66f5' },
    dark: { background: '#1e1e2e', foreground: '#cdd6f4', accent: '#89b4fa' }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    light: { background: '#fffbeb', foreground: '#1f1f1f', accent: '#644ac9' },
    dark: { background: '#282a36', foreground: '#f8f8f2', accent: '#bd93f9' }
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    light: { background: '#fbf1c7', foreground: '#3c3836', accent: '#af3a03' },
    dark: { background: '#282828', foreground: '#ebdbb2', accent: '#fe8019' }
  },
  {
    id: 'nord',
    name: 'Nord',
    light: { background: '#eceff4', foreground: '#2e3440', accent: '#5e81ac' },
    dark: { background: '#2e3440', foreground: '#eceff4', accent: '#88c0d0' }
  },
  {
    id: 'solarized',
    name: 'Solarized',
    light: { background: '#fdf6e3', foreground: '#586e75', accent: '#268bd2' },
    dark: { background: '#002b36', foreground: '#93a1a1', accent: '#268bd2' }
  },
  {
    id: 'everforest',
    name: 'Everforest',
    light: { background: '#fdf6e3', foreground: '#5c6a72', accent: '#8da101' },
    dark: { background: '#2d353b', foreground: '#d3c6aa', accent: '#a7c080' }
  },
  {
    id: 'ayu',
    name: 'Ayu',
    light: { background: '#fcfcfc', foreground: '#5c6166', accent: '#ff9940' },
    dark: { background: '#1f2430', foreground: '#cccac2', accent: '#ffcc66' }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    light: { background: '#e1e2e7', foreground: '#3760bf', accent: '#2e7de9' },
    dark: { background: '#1a1b26', foreground: '#c0caf5', accent: '#7aa2f7' }
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    light: { background: '#fafafa', foreground: '#383a42', accent: '#4078f2' },
    dark: { background: '#282c34', foreground: '#abb2bf', accent: '#61afef' }
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    light: { background: '#faf4ed', foreground: '#575279', accent: '#907aa9' },
    dark: { background: '#191724', foreground: '#e0def4', accent: '#c4a7e7' }
  }
]

export function findPreset(id: string | null | undefined): ThemePreset {
  return (
    THEME_PRESETS.find((p) => p.id === id) ??
    THEME_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!
  )
}

export type NamedAccentId =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'graphite'

/** The macOS system accent colours, light and dark variants. */
export const NAMED_ACCENTS: readonly {
  id: NamedAccentId
  light: string
  dark: string
}[] = [
  { id: 'blue', light: '#007aff', dark: '#0a84ff' },
  { id: 'purple', light: '#af52de', dark: '#bf5af2' },
  { id: 'pink', light: '#ff2d55', dark: '#ff375f' },
  { id: 'red', light: '#ff3b30', dark: '#ff453a' },
  { id: 'orange', light: '#ff9500', dark: '#ff9f0a' },
  { id: 'yellow', light: '#ffcc00', dark: '#ffd60a' },
  { id: 'green', light: '#34c759', dark: '#30d158' },
  { id: 'graphite', light: '#8e8e93', dark: '#98989d' }
]

export const FONT_FAMILY_STACKS = {
  system:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  rounded:
    'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", Nunito, Quicksand, sans-serif'
} as const

export const FONT_WEIGHTS = { light: 300, regular: 400, medium: 500 } as const
