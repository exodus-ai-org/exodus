/**
 * The header's `←` `→` (spec 2026-10-08 §3): the app's own stack of the pages
 * it showed, not the browser's — deterministic (a reload starts it fresh at
 * the page on screen) and unit-testable. Entries are router paths (`/`,
 * `/chat/<id>`); `index` is where the user is. `skipNext` is set by an arrow
 * before it navigates, so the recorder (`hooks/use-route-history.ts`) moves
 * nothing for that location change instead of pushing it.
 */
export interface RouteHistory {
  entries: string[]
  index: number
  skipNext: boolean
}

/** Past this many entries the oldest drops. */
export const MAX_ENTRIES = 50

export const EMPTY_HISTORY: RouteHistory = {
  entries: [],
  index: -1,
  skipNext: false
}

/**
 * A navigation the arrows did not make: everything after `index` (the forward
 * branch) is dropped, `path` is appended unless it is the current entry, and
 * the index moves to the end.
 */
export function pushed(state: RouteHistory, path: string): RouteHistory {
  if (state.entries[state.index] === path) {
    return state.skipNext ? { ...state, skipNext: false } : state
  }
  const entries = [...state.entries.slice(0, state.index + 1), path]
  const kept = entries.slice(Math.max(0, entries.length - MAX_ENTRIES))
  return { entries: kept, index: kept.length - 1, skipNext: false }
}

export function canGoBack(state: RouteHistory): boolean {
  return state.index > 0
}

export function canGoForward(state: RouteHistory): boolean {
  return state.index >= 0 && state.index < state.entries.length - 1
}

/** One step back, marked for the recorder; the same state when there is none. */
export function back(state: RouteHistory): RouteHistory {
  return canGoBack(state)
    ? { ...state, index: state.index - 1, skipNext: true }
    : state
}

export function forward(state: RouteHistory): RouteHistory {
  return canGoForward(state)
    ? { ...state, index: state.index + 1, skipNext: true }
    : state
}

/** The entry the user is on; undefined while nothing was recorded. */
export function current(state: RouteHistory): string | undefined {
  return state.entries[state.index]
}

/**
 * A deleted chat's entries are removed, the consecutive duplicates that
 * creates collapse, and the index follows the page in view — or, when that
 * page was the deleted chat, stays at the same depth (as deep as is left).
 */
export function without(state: RouteHistory, path: string): RouteHistory {
  if (!state.entries.includes(path)) return state
  const entries: string[] = []
  let index = -1
  state.entries.forEach((entry, i) => {
    if (entry === path) return
    if (entries.at(-1) !== entry) entries.push(entry)
    if (i === state.index) index = entries.length - 1
  })
  if (index === -1) index = Math.min(state.index, entries.length - 1)
  return { entries, index, skipNext: false }
}
