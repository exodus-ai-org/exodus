import type { Context } from 'hono'

import type { Settings } from '../db/schema'

export type ListenerKind = 'loopback' | 'lan'

/** @hono/node-server's bindings, plus which of our two listeners took the request. */
export interface Bindings {
  listener?: ListenerKind
  incoming?: { socket?: { remoteAddress?: string } }
}

export interface Variables {
  settings: Settings
  /** Set by authGate for a request from a paired device. */
  deviceId?: string
}

/** `app.request()` in unit tests passes no bindings: that is the loopback case. */
export function listenerOf(c: Context): ListenerKind {
  return (c.env as Bindings | undefined)?.listener ?? 'loopback'
}
