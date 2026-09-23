import { serve } from '@hono/node-server'

import { logger } from '../logger'
import type { Bindings } from '../server/types'
import { loadOrCreateCertificate } from './certificate'
import { hasDevices } from './devices'
import { createLanListener, type LanListener } from './listener'
import {
  createPairing,
  PAIRING_TTL_MS,
  type PairingWindow,
  randomPairingCode
} from './pairing'

/**
 * LAN access, wired together: one pairing window and one HTTPS listener for the
 * process. The listener is wanted while a window is open or a device is paired;
 * everything that changes either calls `syncLan()`.
 */
export const pairing = createPairing({
  now: Date.now,
  randomCode: randomPairingCode
})

let listener: LanListener | null = null

export function initLan(
  fetch: (request: Request, env: Bindings) => Response | Promise<Response>
): void {
  listener = createLanListener({
    fetch,
    wanted: async () => pairing.current() !== null || (await hasDevices()),
    certificate: loadOrCreateCertificate,
    serve
  })
}

/** Never rejects: callers are request handlers and boot code. */
export async function syncLan(): Promise<void> {
  await listener?.sync().catch((error) => {
    logger.error('lan', 'Failed to sync the LAN listener', {
      error: String(error)
    })
  })
}

/** A window nobody uses must also take the listener back down when it lapses. */
export function openPairingWindow(): PairingWindow {
  const window = pairing.open()
  setTimeout(() => void syncLan(), PAIRING_TTL_MS + 100).unref()
  return window
}

export const stopLan = (): void => listener?.stop()
export const isLanRunning = (): boolean => listener?.isRunning() ?? false
