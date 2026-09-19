import { randomBytes, timingSafeEqual } from 'crypto'
import type { NetworkInterfaceInfo } from 'os'

export const PAIRING_TTL_MS = 120_000
export const MAX_PAIRING_ATTEMPTS = 5

export interface PairingWindow {
  code: string
  expiresAt: number
}

export type VerifyResult = 'ok' | 'wrong' | 'closed'

export interface Pairing {
  open(): PairingWindow
  close(): void
  current(): PairingWindow | null
  verify(code: string): VerifyResult
}

/** 128 bits — the code only has to survive two minutes and five guesses. */
export function randomPairingCode(): string {
  return randomBytes(16).toString('base64url')
}

function sameCode(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * The one moment a new device may join: opened from the desktop's screen, shown
 * as a QR code, gone after one use, two minutes, or five wrong guesses. Pure —
 * the clock and the RNG come in — so every edge of it is unit-tested.
 */
export function createPairing(deps: {
  now(): number
  randomCode(): string
}): Pairing {
  let window: PairingWindow | null = null
  let attempts = 0

  function current(): PairingWindow | null {
    if (window && deps.now() >= window.expiresAt) window = null
    return window
  }

  return {
    open() {
      window = {
        code: deps.randomCode(),
        expiresAt: deps.now() + PAIRING_TTL_MS
      }
      attempts = 0
      return window
    },
    close() {
      window = null
    },
    current,
    verify(code) {
      const open = current()
      if (!open) return 'closed'
      if (sameCode(code, open.code)) {
        window = null
        return 'ok'
      }
      attempts++
      if (attempts >= MAX_PAIRING_ATTEMPTS) {
        window = null
        return 'closed'
      }
      return 'wrong'
    }
  }
}

/** What the QR code says — see exodus-ios `PairingLink` for the reader. */
export function buildPairingLink(p: {
  hosts: string[]
  port: number
  code: string
  fingerprint: string
  name: string
}): string {
  const query = new URLSearchParams({
    h: p.hosts.join(','),
    p: String(p.port),
    c: p.code,
    f: p.fingerprint,
    n: p.name
  })
  return `exodus://pair?${query.toString()}`
}

/** Every address a phone on the LAN might reach this machine by. */
export function lanHosts(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  hostname: string
): string[] {
  const addresses = Object.values(interfaces)
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)
  const local = hostname.endsWith('.local') ? hostname : `${hostname}.local`
  return [...addresses, local]
}
