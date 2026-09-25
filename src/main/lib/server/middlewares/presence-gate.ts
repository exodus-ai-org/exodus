import type { Context, Next } from 'hono'

import { isPresenceToken, PRESENCE_HEADER } from '../../presence'
import { listenerOf } from '../types'

/**
 * Routes that act for the user in person: answering a tool-approval prompt
 * and managing paired devices. Anything on loopback can reach the API — that
 * includes a `curl` the model runs with the `terminal` tool, which could
 * otherwise approve its own paused call, or open a pairing window, read its
 * code and pair itself a device that approves over the LAN. So on loopback
 * these need the presence token only Exodus's own window holds (IPC, see
 * `presence.ts`); on the LAN listener `authGate` has already required a
 * paired device's token, which is what the user in person holds there.
 */
export const PRESENCE_PATHS = ['/api/v1/chat/approval', '/api/v1/devices']

export function needsPresence(path: string): boolean {
  return PRESENCE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}

export async function presenceGate(c: Context, next: Next) {
  if (!needsPresence(c.req.path)) return next()
  if (listenerOf(c) === 'lan') return next()
  if (isPresenceToken(c.req.header(PRESENCE_HEADER))) return next()
  return c.json(
    {
      type: 'error',
      error: {
        code: 'PRESENCE_REQUIRED',
        message: 'Only the Exodus window can do this.'
      }
    },
    403
  )
}
