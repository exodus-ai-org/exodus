// Shared drawing helpers for the brand variants in brand/<variant>/art.mjs.
// All art is drawn on a 1024 × 1024 canvas.

export const blurs = (u) =>
  [4, 8, 14, 24, 44]
    .map(
      (n) =>
        `<filter id="${u}b${n}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n}"/></filter>`
    )
    .join('')

const stops = (list) =>
  list
    .map(
      ([o, c, a = 1]) =>
        `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`
    )
    .join('')
export const lin = (id, list, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`
export const rad = (id, list, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`

// ── macOS / desktop shapes ────────────────────────────────────────────────

/** A superellipse (n = 5) close to Apple's continuous-corner squircle. */
export function squircle(x, y, size, n = 5, steps = 200) {
  const r = size / 2
  const cx = x + r
  const cy = y + r
  const pts = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push(
      `${(cx + r * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(2)},${(
        cy +
        r * Math.sign(s) * Math.abs(s) ** (2 / n)
      ).toFixed(2)}`
    )
  }
  return `M${pts.join('L')}Z`
}

/**
 * A variant's `icon` inside a squircle. `inset` is the margin on a 1024 canvas:
 * macOS's grid is 100 (an 824 body) with a drop shadow; other desktops use
 * a small margin and no shadow.
 */
export function framed(
  u,
  icon,
  { inset = 100, shadow = true, dark = false } = {}
) {
  const size = 1024 - inset * 2
  const path = squircle(inset, inset, size)
  const k = size / 1024
  return `<defs>
    <clipPath id="${u}sq"><path d="${path}"/></clipPath>
    <filter id="${u}drop" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  ${shadow ? `<path d="${path}" transform="translate(0 10)" fill="#000" opacity=".3" filter="url(#${u}drop)"/>` : ''}
  <g clip-path="url(#${u}sq)"><g transform="translate(${inset} ${inset}) scale(${k})">${icon(`${u}i`, { dark })}</g></g>`
}

export const svg = (body, w = 1024, h = w, vb = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>\n`
