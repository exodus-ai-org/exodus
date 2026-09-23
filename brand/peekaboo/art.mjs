// Peekaboo — the Exodus mascot, Ody, leaning in from the corner.
//
// Every icon, splash and web asset is generated from these functions by
// scripts/render-icons.mjs; edit the art here, then run `bun run icons`.
// Drawn on a 1024 × 1024 canvas (the menu bar glyph on 16 × 16).

import { blurs, lin, rad } from '../lib.mjs'

export const PALETTE = {
  mint: '#9AF3D6',
  jade: '#22B088',
  mintDark: '#12302A',
  jadeDark: '#071512',
  mallow: '#F6F2EC',
  blush: '#FF7E95',
  ink: '#1B1B1F',
  // Splash / web surfaces
  paper: ['#E8FBF4', '#D0F4E7'],
  text: '#0B4A3A',
  accent: '#1E9E7A'
}

// Ody as a rounded egg: no flat base, so nothing straight enters the frame.
const EGG =
  'M512 210C712 210 830 420 830 610C830 800 700 930 512 930C324 930 194 800 194 610C194 420 312 210 512 210Z'
// Where Ody sits in the frame: feet at (512, 850) in its own space, moved to
// the lower-right corner and tilted so the head leans in.
const PLACE = 'translate(800 1080) rotate(-20) scale(1.22) translate(-512 -850)'

function odyDefs(u) {
  return `${rad(
    `${u}body`,
    [
      [0, '#FFFFFF'],
      [0.5, PALETTE.mallow],
      [1, '#D3C8B8']
    ],
    0.36,
    0.26,
    0.85
  )}
  ${lin(`${u}rim`, [
    [0.5, '#7A5A2A', 0],
    [1, '#7A5A2A', 0.3]
  ])}
  <clipPath id="${u}clip"><path d="${EGG}"/></clipPath>`
}

// `part`: 'all', 'body' (everything but the eyes) or 'eyes' — the boot
// splash animates the eyes on a layer of their own so they can blink.
function ody(u, part = 'all') {
  // Looking left, into the frame, mouth a small "o".
  const [x1, x2, ey] = [328, 446, 522]
  const mid = (x1 + x2) / 2
  const eyes = `<g fill="${PALETTE.ink}"><ellipse cx="${x1}" cy="${ey}" rx="31" ry="60"/><ellipse cx="${x2}" cy="${ey}" rx="31" ry="60"/></g>
    <g fill="#fff"><circle cx="${x1 - 6}" cy="${ey - 28}" r="10"/><circle cx="${x2 - 6}" cy="${ey - 28}" r="10"/></g>`
  if (part === 'eyes') return `<g transform="${PLACE}">${eyes}</g>`
  return `<g transform="${PLACE}">
    <path d="${EGG}" fill="url(#${u}body)"/>
    <path d="${EGG}" fill="url(#${u}rim)" opacity=".6"/>
    <g clip-path="url(#${u}clip)">
      <path d="${EGG}" fill="none" stroke="#B9A88F" stroke-width="160" opacity=".32" filter="url(#${u}b44)" transform="translate(-30 -20)"/>
      <path d="${EGG}" fill="none" stroke="#fff" stroke-width="30" opacity=".45" filter="url(#${u}b14)" transform="translate(14 10)"/>
    </g>
    <ellipse cx="398" cy="372" rx="84" ry="42" transform="rotate(-38 398 372)" fill="#fff" filter="url(#${u}b14)"/>
    ${part === 'all' ? eyes : ''}
    <g fill="${PALETTE.blush}" opacity=".5" filter="url(#${u}b4)"><ellipse cx="${x1 - 58}" cy="${ey + 116}" rx="34" ry="16"/><ellipse cx="${x2 + 48}" cy="${ey + 112}" rx="32" ry="16"/></g>
    <ellipse cx="${mid}" cy="${ey + 100}" rx="15" ry="19" fill="${PALETTE.ink}"/>
  </g>`
}

const LINE_PATHS = ['M236 236l-18-58', 'M170 300l-44-40', 'M150 400h-60']
const line = (d) =>
  `<g fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".85"><path d="${d}"/></g>`
const LINES = LINE_PATHS.map((d) => line(d)).join('')

// ── Layers ────────────────────────────────────────────────────────────────

/** Background: the mint gradient and its top glow. */
export function background(u, { dark = false } = {}) {
  const [a, b] = dark
    ? [PALETTE.mintDark, PALETTE.jadeDark]
    : [PALETTE.mint, PALETTE.jade]
  return `<defs>${blurs(u)}${lin(`${u}bg`, [
    [0, a],
    [1, b]
  ])}</defs>
  <rect width="1024" height="1024" fill="url(#${u}bg)"/>
  <ellipse cx="512" cy="110" rx="560" ry="290" fill="#fff" opacity="${dark ? 0.05 : 0.26}" filter="url(#${u}b44)"/>`
}

/** Ody, with the soft contact shadow under it unless `shadow: false`. */
export function character(
  u,
  { dark = false, shadow = true, part = 'all' } = {}
) {
  if (part === 'eyes') return ody(u, 'eyes')
  return `<defs>${blurs(u)}${odyDefs(u)}</defs>
  ${
    shadow
      ? `<ellipse cx="700" cy="1000" rx="420" ry="90" fill="${dark ? '#000' : '#0E6A50'}" opacity=".35" filter="url(#${u}b44)"/>`
      : ''
  }
  ${ody(u, part)}`
}

/** The three "spotted you" strokes. */
export function lines() {
  return LINES
}

/** Full-bleed square icon (what iOS and Icon Composer's preview expect). */
export function icon(u, { dark = false } = {}) {
  return `${background(`${u}g`, { dark })}${lines()}${character(`${u}c`, { dark })}`
}

/** iOS 18+ tinted variant: a greyscale foreground on black. */
export function tinted(u) {
  return `<defs><filter id="${u}grey"><feColorMatrix type="saturate" values="0"/></filter></defs>
  <rect width="1024" height="1024" fill="#000"/>
  <g filter="url(#${u}grey)">${lines()}${character(`${u}c`, { dark: true })}</g>`
}

/** Layers for Apple's Icon Composer, bottom to top. */
export function composerLayers() {
  return {
    background: background('bg'),
    'background-dark': background('bd', { dark: true }),
    lines: lines(),
    ody: character('o', { shadow: false })
  }
}

// ── Menu bar ──────────────────────────────────────────────────────────────

/** Template glyph on a 16 × 16 grid: black on transparent. */
export function glyph(u) {
  const egg =
    'M8 2.4C11.3 2.4 13.9 6.1 13.9 9.9C13.9 13.6 11.4 16.4 8 16.4C4.6 16.4 2.1 13.6 2.1 9.9C2.1 6.1 4.7 2.4 8 2.4Z'
  return `<mask id="${u}m" maskUnits="userSpaceOnUse" x="-8" y="-8" width="32" height="32"><rect x="-8" y="-8" width="32" height="32" fill="#fff"/><ellipse cx="5.3" cy="8.4" rx=".85" ry="1.55" fill="#000"/><ellipse cx="7.6" cy="8.4" rx=".85" ry="1.55" fill="#000"/><ellipse cx="6.5" cy="10.9" rx=".5" ry=".6" fill="#000"/></mask>
  <g transform="translate(11.2 18.2) rotate(-20) scale(1.22) translate(-8 -14.2)"><path d="${egg}" mask="url(#${u}m)"/></g>
  <g stroke="#000" stroke-width="1.1" stroke-linecap="round"><path d="M2.6 3.6L1.4 2.6"/><path d="M2 5.8H.6"/></g>`
}

/**
 * The tray's viewBox: the glyph (y 2.6–16, cropped flat at the bottom)
 * centred in the 22-pt item like every other menu bar icon.
 */
export const GLYPH_VIEWBOX = '-1.2 -0.2 19 19'

// ── Boot splash (index.html) ──────────────────────────────────────────────

/**
 * The markup + CSS that index.html paints before any JS has loaded. Ody's
 * body, eyes and the three lines are separate layers so each can move, and
 * every animation is transform/opacity only: those run on the compositor,
 * so they keep going while the main thread is busy evaluating the module
 * graph (exactly when this splash is on screen).
 */
export function bootSplash() {
  const layer = (cls, body) =>
    `<div class="${cls}"><svg viewBox="0 0 1024 1024" width="100%" height="100%">${body}</svg></div>`
  const html = `<div id="boot-splash" aria-hidden="true">
        <div class="bs-icon">
          ${layer('bs-layer', background('bsb'))}
          ${LINE_PATHS.map((d, i) => layer(`bs-layer bs-line bs-line-${i + 1}`, line(d))).join('\n          ')}
          <div class="bs-layer bs-enter"><div class="bs-layer bs-bob">
            ${layer('bs-layer', character('bso', { part: 'body' }))}
            ${layer('bs-layer bs-eyes', character('bse', { part: 'eyes' }))}
          </div></div>
        </div>
        <div class="bs-dots"><i></i><i></i><i></i></div>
      </div>`
  const css = `#boot-splash {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 22px;
      }
      #boot-splash .bs-icon {
        position: relative;
        width: 96px;
        height: 96px;
        border-radius: 22.4%;
        overflow: hidden;
        box-shadow: 0 8px 24px rgb(0 0 0 / 16%), 0 1px 2px rgb(0 0 0 / 12%);
        animation: bs-rise 500ms cubic-bezier(0.23, 1, 0.32, 1) both;
      }
      #boot-splash .bs-layer {
        position: absolute;
        inset: 0;
      }
      /* Ody runs past the layer's box; the icon's rounded clip trims it,
         so the layers must not clip on their own or the bob shows an edge. */
      #boot-splash svg {
        display: block;
        overflow: visible;
      }
      /* Ody leans in from the corner, then keeps breathing. */
      #boot-splash .bs-enter {
        animation: bs-peek 700ms 120ms cubic-bezier(0.23, 1, 0.32, 1) both;
      }
      #boot-splash .bs-bob {
        transform-origin: 80% 100%;
        animation: bs-bob 2400ms 820ms cubic-bezier(0.77, 0, 0.175, 1) infinite;
      }
      #boot-splash .bs-eyes {
        transform-origin: 51% 74%;
        animation: bs-blink 3600ms 1400ms infinite;
      }
      #boot-splash .bs-line {
        transform-origin: 26% 30%;
        animation: bs-spot 1800ms cubic-bezier(0.23, 1, 0.32, 1) infinite both;
      }
      #boot-splash .bs-line-1 { animation-delay: 700ms; }
      #boot-splash .bs-line-2 { animation-delay: 780ms; }
      #boot-splash .bs-line-3 { animation-delay: 860ms; }
      #boot-splash .bs-dots {
        display: flex;
        gap: 6px;
      }
      #boot-splash .bs-dots i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: oklch(0.556 0 0);
        animation: bs-dot 1200ms cubic-bezier(0.77, 0, 0.175, 1) infinite both;
      }
      #boot-splash .bs-dots i:nth-child(2) { animation-delay: 150ms; }
      #boot-splash .bs-dots i:nth-child(3) { animation-delay: 300ms; }
      @keyframes bs-rise {
        from { opacity: 0; transform: translateY(6px) scale(0.96); }
      }
      @keyframes bs-peek {
        from { transform: translate(22%, 22%) rotate(8deg); }
      }
      @keyframes bs-bob {
        0%, 100% { transform: none; }
        50% { transform: translate(-2.5%, -3%) rotate(-2.5deg); }
      }
      @keyframes bs-blink {
        0%, 92%, 100% { transform: none; }
        95% { transform: scaleY(0.12); }
      }
      @keyframes bs-spot {
        0% { opacity: 0; transform: scale(0.6); }
        25%, 70% { opacity: 1; transform: none; }
        100% { opacity: 0; transform: none; }
      }
      @keyframes bs-dot {
        0%, 100% { opacity: 0.25; transform: none; }
        40% { opacity: 0.9; transform: translateY(-3px); }
      }
      @media (prefers-color-scheme: dark) {
        #boot-splash .bs-dots i { background: oklch(0.708 0 0); }
      }
      @media (prefers-reduced-motion: reduce) {
        #boot-splash .bs-icon,
        #boot-splash .bs-enter,
        #boot-splash .bs-bob,
        #boot-splash .bs-line { animation: none; }
        #boot-splash .bs-dots i { transform: none; }
      }`
  return { html, css }
}
