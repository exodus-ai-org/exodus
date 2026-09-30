// CSS colours as the tests need them: relative luminance and WCAG contrast
// of `#RRGGBB` and `oklch(L C H)` values.

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

function oklchToLinear(L: number, C: number, H: number): number[] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map((c) => Math.min(1, Math.max(0, c)))
}

/** Relative luminance of an opaque `#RRGGBB` or `oklch(L C H)` colour. */
export function luminanceOf(css: string): number {
  const value = css.trim()
  const hex = /^#([0-9a-f]{6})$/iu.exec(value)
  const oklch = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/iu.exec(value)
  let linear: number[]
  if (hex) {
    linear = [0, 2, 4].map((i) =>
      toLinear(Number.parseInt(hex[1].slice(i, i + 2), 16) / 255)
    )
  } else if (oklch) {
    linear = oklchToLinear(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]))
  } else {
    throw new Error(`not an opaque colour this helper reads: ${css}`)
  }
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/** WCAG contrast ratio of two colours. */
export function contrastOf(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].toSorted((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
