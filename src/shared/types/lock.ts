// src/shared/types/lock.ts

/** Non-secret, user-tunable lock behavior. Persisted as plain JSON. */
export interface LockConfig {
  /** macOS Touch ID offered on the lock screen. */
  touchIdEnabled: boolean
  /** Idle auto-lock after this many ms of no activity. 0 = disabled. */
  idleTimeoutMs: number
  /** Require unlock every app launch. */
  lockOnLaunch: boolean
  /** Lock when the OS sleeps / screensaver activates. */
  lockOnSystemSleep: boolean
}

export const DEFAULT_LOCK_CONFIG: LockConfig = {
  touchIdEnabled: false,
  idleTimeoutMs: 0,
  lockOnLaunch: false,
  lockOnSystemSleep: false
}

/** Snapshot sent to the renderer. Never includes the PIN/hash. */
export interface LockStatus {
  hasPin: boolean
  locked: boolean
  config: LockConfig
  /** ms the renderer must wait before another unlock attempt (backoff). */
  retryAfterMs: number
  /** Whether macOS Touch ID is available on this machine. */
  touchIdAvailable: boolean
}

export interface LockNotification {
  id: string
  title: string
  body: string
  timestamp: number
}

export type UnlockResult =
  | { ok: true }
  | {
      ok: false
      reason: 'wrong-pin' | 'locked-out' | 'no-pin'
      retryAfterMs: number
    }

export const LOCK_CHANNELS = {
  getStatus: 'lock:get-status',
  unlock: 'lock:unlock',
  unlockTouchId: 'lock:unlock-touchid',
  lockNow: 'lock:lock-now',
  setPin: 'lock:set-pin',
  changePin: 'lock:change-pin',
  disable: 'lock:disable',
  setConfig: 'lock:set-config',
  pingActivity: 'lock:ping-activity',
  getRecentNotifications: 'lock:get-recent-notifications',
  // main → renderer (events)
  stateChanged: 'lock:state-changed',
  notification: 'lock:notification'
} as const
