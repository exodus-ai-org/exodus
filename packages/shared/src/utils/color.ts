// Pure colour maths for the appearance system — no DOM, no dependencies.
// sRGB ⇄ OKLab per Björn Ottosson (https://bottosson.github.io/posts/oklab/).

export type Rgb = [number, number, number] // 0..255 ints

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function parseHex(input: string): Rgb | null {
  const m = HEX_RE.exec(input.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const clamp255 = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function formatHex([r, g, b]: Rgb): string {
  return (
    '#' +
    [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')
  )
}

/** `#abc` / `ABC` / `#AABBCC` → `#aabbcc`; null when not a hex colour. */
export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input)
  return rgb ? formatHex(rgb) : null
}

export function isHexColor(input: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(input)
}

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const toGamma = (c: number) => {
  const v = clamp01(c)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

type Lab = [number, number, number]

function srgbToOklab([r, g, b]: Rgb): Lab {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

function oklabToSrgb([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [toGamma(lr) * 255, toGamma(lg) * 255, toGamma(lb) * 255]
}

/** Interpolate `a → b` in OKLab. `t` is clamped to [0, 1]. */
export function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a)
  const rb = parseHex(b)
  if (!ra || !rb) throw new Error(`mix(): invalid hex (${a}, ${b})`)
  const k = clamp01(t)
  if (k === 0) return formatHex(ra)
  if (k === 1) return formatHex(rb)
  const la = srgbToOklab(ra)
  const lb = srgbToOklab(rb)
  return formatHex(
    oklabToSrgb([
      la[0] + (lb[0] - la[0]) * k,
      la[1] + (lb[1] - la[1]) * k,
      la[2] + (lb[2] - la[2]) * k
    ])
  )
}

/** WCAG 2.x relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) throw new Error(`relativeLuminance(): invalid hex (${hex})`)
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 .. 21. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const AA = 4.5

/**
 * The most legible text colour for `color`: the best of `preferred` when it
 * reaches WCAG AA, otherwise the best of `preferred` + `fallback`.
 */
export function contrastingForeground(
  color: string,
  preferred: readonly string[],
  fallback: readonly string[] = ['#ffffff', '#000000']
): string {
  const best = (cands: readonly string[]) =>
    cands.reduce((acc, c) =>
      contrastRatio(color, c) > contrastRatio(color, acc) ? c : acc
    )
  const p = best(preferred)
  if (contrastRatio(color, p) >= AA) return p
  return best([...preferred, ...fallback])
}
