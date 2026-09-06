// Computer Runtime — session liveness + the global abort hotkey.
//
// Tracks every running computer-use session by id and owns the process-wide
// ⌥⇧⎋ (`Alt+Shift+Escape`) kill switch. The hotkey is registered only while at
// least one session is live (0→1 transition) and released the moment the last
// one ends (1→0), so it never shadows that chord when computer-use is idle.
//
// `abortAll(reason)` is the single fan-out point: it calls `guard.abort(reason)`
// on every registered `Guard`, and Task 8 made `Guard` the abort authority
// (`abort()` trips `guard.signal`), so a session parked in a `wait` sleep or
// blocked in `askHuman` still unwinds promptly. Spec §2.5 / §3.5.
//
// Wiring: Task 9's `computer-use` tool creates a fresh `Guard` per run and
// registers it with `liveness.start(sessionId, guard)` / `liveness.end(...)`
// in a `finally`. `POST /api/computer-use/abort` calls `abortAll('user')`.

import { globalShortcut } from 'electron'

import type { Guard } from './guard'

type AbortReason = 'hotkey' | 'user' | 'system'

const HOTKEY = 'Alt+Shift+Escape'

const guards = new Map<string, Guard>()

function registerHotkey(): void {
  try {
    globalShortcut.register(HOTKEY, () => liveness.abortAll('hotkey'))
  } catch {
    // globalShortcut is unavailable outside a running Electron app (tests, a
    // headless environment). The in-session Guard signal and the Stop button
    // still work; only the global chord is missing.
  }
}

function unregisterHotkey(): void {
  try {
    globalShortcut.unregister(HOTKEY)
  } catch {
    // See registerHotkey — nothing to release if registration never happened.
  }
}

export const liveness = {
  /** Register a live session. Registers the global hotkey on the 0→1 edge. */
  start(sessionId: string, guard: Guard): void {
    const isNew = !guards.has(sessionId)
    guards.set(sessionId, guard)
    // A brand-new id that leaves the map at size 1 is the 0→1 transition.
    if (isNew && guards.size === 1) registerHotkey()
  },

  /** Drop a session. Releases the global hotkey on the 1→0 edge. Unknown id: no-op. */
  end(sessionId: string): void {
    if (!guards.delete(sessionId)) return
    if (guards.size === 0) unregisterHotkey()
  },

  /** Abort every live session with `reason`. */
  abortAll(reason: AbortReason): void {
    for (const guard of guards.values()) guard.abort(reason)
  },

  /** How many sessions are currently live. */
  get count(): number {
    return guards.size
  }
}
