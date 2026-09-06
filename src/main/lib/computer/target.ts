// Computer Runtime — target-window resolution.
//
// Turns a user-supplied app name ("Chess", "Chrome") into a concrete
// `TargetWindow` (CGWindowID + screen bounds) via `helper.listWindows()`, and
// re-reads a tracked window's bounds/title each session step (windows move and
// get retitled while a session runs).
//
// Pure apart from the injected `InputHelper`; unit-tested with an inline stub.

import type { InputHelper, TargetWindow } from './types'

/** Thrown by `resolveTarget` when no open window matches the query. */
export class TargetNotFound extends Error {
  constructor(query: string) {
    super(`No window found for "${query}"`)
    this.name = 'TargetNotFound'
  }
}

/** Thrown by `refreshBounds` when the tracked window is no longer open. */
export class WindowGone extends Error {
  constructor(cgWindowId: number) {
    super(`Window ${cgWindowId} is gone`)
    this.name = 'WindowGone'
  }
}

/**
 * Resolve `appQuery` to the single best-matching open window.
 *
 * A window is a candidate when its `app` OR `bundleId` contains `appQuery`
 * case-insensitively. Among candidates the best is chosen by: a non-empty
 * `title` first, then the larger screen area (`bounds[2] * bounds[3]`). Throws
 * `TargetNotFound` when nothing matches.
 */
export async function resolveTarget(
  appQuery: string,
  helper: InputHelper
): Promise<TargetWindow> {
  const needle = appQuery.toLowerCase()
  const wins = await helper.listWindows()
  const candidates = wins.filter(
    (w) =>
      w.app.toLowerCase().includes(needle) ||
      w.bundleId.toLowerCase().includes(needle)
  )
  if (candidates.length === 0) throw new TargetNotFound(appQuery)

  candidates.sort((a, b) => {
    const byTitle = titleRank(a) - titleRank(b)
    if (byTitle !== 0) return byTitle
    return area(b) - area(a)
  })
  return candidates[0]
}

/**
 * Re-read the live `bounds` and `title` of a tracked window — it may have moved,
 * resized, or been retitled since `resolveTarget`. Returns a fresh
 * `TargetWindow` that keeps `cgWindowId` / `app` / `bundleId` from `t`. Throws
 * `WindowGone` when the window is no longer listed.
 */
export async function refreshBounds(
  t: TargetWindow,
  helper: InputHelper
): Promise<TargetWindow> {
  const wins = await helper.listWindows()
  const w = wins.find((x) => x.cgWindowId === t.cgWindowId)
  if (!w) throw new WindowGone(t.cgWindowId)
  return { ...t, bounds: w.bounds, title: w.title }
}

/** Windows with a non-empty title sort ahead of those without. */
function titleRank(w: TargetWindow): number {
  return w.title !== '' ? 0 : 1
}

function area(w: TargetWindow): number {
  return w.bounds[2] * w.bounds[3]
}
