import type { DevicesState } from '@/services/devices'

/** A phone counts as connected when it called the computer within this long (spec 2026-10-08 §6). */
export const PHONE_ONLINE_WINDOW_MS = 5 * 60_000

export function isPhoneOnline(
  state: DevicesState | undefined,
  now: number = Date.now()
): boolean {
  return !!state?.devices.some((device) => {
    if (!device.lastSeenAt) return false
    const seen = Date.parse(device.lastSeenAt)
    return Number.isFinite(seen) && now - seen <= PHONE_ONLINE_WINDOW_MS
  })
}
