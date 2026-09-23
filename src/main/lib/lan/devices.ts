import { createHash, randomBytes, timingSafeEqual } from 'crypto'

import {
  deleteAllDevices,
  deleteDevice,
  insertDevice,
  listDeviceRows,
  touchDevice
} from '../db/device-queries'
import type { PairedDevice } from '../db/schema'

const SEEN_WRITE_INTERVAL_MS = 60_000

/** 256 bits: unguessable, so a plain SHA-256 is all its storage needs. */
export function mintToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// The gate runs on every LAN request; the table is a handful of rows that only
// change through the functions below, each of which drops this cache — which
// is what makes a revocation take effect on the very next request.
let cache: PairedDevice[] | null = null
const lastSeenWrite = new Map<string, number>()

async function rows(): Promise<PairedDevice[]> {
  cache ??= await listDeviceRows()
  return cache
}

export async function listDevices(): Promise<PairedDevice[]> {
  return rows()
}

export async function hasDevices(): Promise<boolean> {
  return (await rows()).length > 0
}

/** The only time the token exists on this side: it is returned, never stored. */
export async function registerDevice(
  name: string
): Promise<{ deviceId: string; token: string }> {
  const token = mintToken()
  const device = await insertDevice({ name, tokenHash: hashToken(token) })
  cache = null
  return { deviceId: device.id, token }
}

/** The id of the device this token belongs to, or null. */
export async function authenticate(token: string): Promise<string | null> {
  if (!token) return null
  const presented = Buffer.from(hashToken(token), 'hex')
  let match: PairedDevice | null = null
  // Every row, each compared in constant time: nothing about which device
  // matched — or how nearly — is in the timing.
  for (const device of await rows()) {
    if (timingSafeEqual(presented, Buffer.from(device.tokenHash, 'hex'))) {
      match = device
    }
  }
  if (!match) return null

  const now = Date.now()
  if (now - (lastSeenWrite.get(match.id) ?? 0) >= SEEN_WRITE_INTERVAL_MS) {
    lastSeenWrite.set(match.id, now)
    // Bookkeeping: a failed write must not fail the request it describes.
    touchDevice(match.id, new Date(now)).catch(() => {})
  }
  return match.id
}

export async function revokeDevice(id: string): Promise<void> {
  await deleteDevice(id)
  cache = null
  lastSeenWrite.delete(id)
}

export async function revokeAllDevices(): Promise<void> {
  await deleteAllDevices()
  cache = null
  lastSeenWrite.clear()
}
