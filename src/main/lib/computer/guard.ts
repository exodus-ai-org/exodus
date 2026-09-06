import type { Action } from './types'

/**
 * A pre-clamp coordinate this far (px) outside the viewport on either axis is
 * corrected silently; anything further is treated as a model error and rejected
 * (`OutOfBounds`) rather than dragged onto the edge.
 */
export const CLAMP_SLACK = 16

/** `noteFrame` reports `'stuck'` once this many consecutive hashes match. */
export const STUCK_LIMIT = 4

type AbortReason = 'hotkey' | 'user' | 'system'
type Point = [number, number]
type Viewport = { width: number; height: number }

/** Thrown by `Guard.check` when the session has been aborted. */
export class AbortedByUser extends Error {
  readonly reason: AbortReason

  constructor(reason: AbortReason = 'user') {
    super(`Computer session aborted (${reason})`)
    this.name = 'AbortedByUser'
    this.reason = reason
  }
}

/** Thrown by `Guard.check` when a point is more than `CLAMP_SLACK` px out. */
export class OutOfBounds extends Error {
  constructor(point: Point, viewport: Viewport) {
    super(
      `Point [${point[0]}, ${point[1]}] is more than ${CLAMP_SLACK}px outside ` +
        `the ${viewport.width}x${viewport.height} viewport`
    )
    this.name = 'OutOfBounds'
  }
}

/**
 * The safety layer around a computer-use session. The session calls
 * `check(action, viewport)` before executing each action; `abort(reason)` is
 * wired to the global hotkey and the Stop button; `noteFrame(hash)` detects a
 * loop that has stopped making progress (screen not changing).
 *
 * The Guard is the session's single abort authority: `abort()` sets the flag
 * *and* fires `signal`, so a session parked in a `wait` sleep or blocked in
 * `askHuman` — neither of which the caller's `AbortSignal` reaches on its own —
 * still unwinds promptly. The session links the run's `AbortSignal` into here.
 *
 * Spec §2.5. Pure — no Electron, no I/O.
 */
export class Guard {
  private abortReason: AbortReason | null = null
  private frames: string[] = []
  private readonly controller = new AbortController()

  /** Whether the session has been aborted. */
  get aborted(): boolean {
    return this.abortReason !== null
  }

  /**
   * Fires the moment `abort()` is called. Every awaited op in the session is
   * raced against this, so an abort is observed even mid-sleep / mid-wait.
   */
  get signal(): AbortSignal {
    return this.controller.signal
  }

  /** Mark the session aborted. Idempotent; the first reason wins. */
  abort(reason: AbortReason): void {
    if (this.abortReason !== null) return
    this.abortReason = reason
    this.controller.abort()
  }

  /**
   * Validate an action against the current viewport. Returns the action with
   * every point clamped to `[0, 0, width, height]`. Throws `AbortedByUser` if
   * the session was aborted, or `OutOfBounds` if an original point was more
   * than `CLAMP_SLACK` px outside the viewport on either axis.
   *
   * Non-point action kinds are returned unchanged (after the abort check).
   */
  check(action: Action, viewport: Viewport): Action {
    if (this.aborted) throw new AbortedByUser(this.abortReason ?? 'user')

    switch (action.kind) {
      case 'moveMouse':
      case 'click':
        return { ...action, to: clampPoint(action.to, viewport) }
      case 'drag':
        return {
          ...action,
          from: clampPoint(action.from, viewport),
          to: clampPoint(action.to, viewport)
        }
      default:
        return action
    }
  }

  /**
   * Record a screenshot hash. Returns `'stuck'` when the last `STUCK_LIMIT`
   * hashes are all identical (the screen has not changed across that many
   * steps), otherwise `'ok'`.
   */
  noteFrame(hash: string): 'ok' | 'stuck' {
    this.frames.push(hash)
    if (this.frames.length > STUCK_LIMIT) this.frames.shift()

    const stuck =
      this.frames.length === STUCK_LIMIT && this.frames.every((h) => h === hash)
    return stuck ? 'stuck' : 'ok'
  }
}

function clampPoint([x, y]: Point, viewport: Viewport): Point {
  const clampedX = clamp(x, 0, viewport.width)
  const clampedY = clamp(y, 0, viewport.height)
  if (
    Math.abs(x - clampedX) > CLAMP_SLACK ||
    Math.abs(y - clampedY) > CLAMP_SLACK
  ) {
    throw new OutOfBounds([x, y], viewport)
  }
  return [clampedX, clampedY]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
