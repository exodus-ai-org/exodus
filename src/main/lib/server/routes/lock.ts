import { Hono } from 'hono'

import { getLockManager } from '../../lock/lock-manager'
import { logger } from '../../logger'
import type { Variables } from '../types'
import { successResponse } from '../utils'

// Mounted ahead of the lock gate in app.ts, so this reaches its handler while
// the app is locked; authGate still runs first (see app.ts), so only a
// request that already carries a paired device's token — or comes from
// loopback — gets here at all.
const lockRouter = new Hono<{ Variables: Variables }>()

// A paired device's own biometric (Face ID, verified on the phone) stands in
// for the PIN, the same way the computer's own Touch ID already does
// (`LOCK_CHANNELS.unlockTouchId` in lock/ipc.ts calls `completeUnlock()`
// directly too) — the trust is in the device having a token at all, not in
// re-proving the PIN. No PIN is read or checked here.
lockRouter.post('/unlock', (c) => {
  const manager = getLockManager()
  if (manager.isLocked()) {
    manager.completeUnlock()
    logger.info('app', 'Unlocked by a paired device', {
      deviceId: c.get('deviceId') ?? 'loopback'
    })
  }
  return successResponse(c, { locked: manager.isLocked() })
})

export default lockRouter
