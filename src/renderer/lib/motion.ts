import type { CSSProperties } from 'react'

/**
 * How things arrive, app-wide. The curves are the `ease-*` tokens in
 * globals.css; these are the entrances built on them, as class strings.
 *
 * `starting:` (@starting-style) needs no mount effect, and being a transition
 * rather than a keyframe it never restarts from zero. Only for what appears
 * occasionally — a page, a list row, a panel, a step in a timeline; never on
 * a switch, a select or anything typed, and never on a keyboard shortcut's
 * result.
 */

/** A short fade on a strong ease-out. */
export const ENTER =
  'transition-[opacity,translate,scale] duration-300 ease-out starting:opacity-0'
/** The fade plus a 6px rise. */
export const ENTER_UP = `${ENTER} starting:translate-y-1.5`
/**
 * A small row arriving in a list that is still growing (a timeline step, a
 * tool card): seen many times a reply, so shorter than a page and moving
 * less — enough that it does not pop.
 */
export const ROW_ENTER =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0'
/**
 * A whole page swapping in on a tab change: seen far more often than a row,
 * so shorter and barely moving — enough that the swap is not a hard cut.
 */
export const PAGE_ENTER =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0'

const STAGGER_MS = 40
// A long list staggered all the way down would still be arriving a second
// later; past this many items the rest come in together.
const STAGGER_CAP = 6

/** `style` for the `index`-th of a few items entering together. */
export function staggerDelay(index: number): CSSProperties {
  return { transitionDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` }
}
