import type { CSSProperties } from 'react'

export const HUE_NAMES = [
  'lilac',
  'mint',
  'peach',
  'sky',
  'rose',
  'honey',
  'periwinkle',
  'sage'
] as const

export type HueName = (typeof HUE_NAMES)[number]

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pickHue(seed: string | null | undefined): HueName {
  const key = seed && seed.length > 0 ? seed : 'default'
  return HUE_NAMES[hash(key) % HUE_NAMES.length]
}

export function hueStyle(hue: HueName): CSSProperties {
  return {
    background: `var(--ph-hue-${hue}-fill)`,
    boxShadow: `inset 0 0 0 1.5px var(--ph-hue-${hue}-ring)`
  }
}

export function hueFill(hue: HueName): string {
  return `var(--ph-hue-${hue}-fill)`
}

export function hueRing(hue: HueName): string {
  return `var(--ph-hue-${hue}-ring)`
}
