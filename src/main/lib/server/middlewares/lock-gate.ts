import type { Context, Next } from 'hono'

import { getLockManager } from '../../lock/lock-manager'

export async function lockGate(c: Context, next: Next) {
  if (getLockManager().isLocked()) {
    return c.json(
      { error: { code: 'LOCKED', message: 'Application is locked' } },
      423
    )
  }
  return next()
}
