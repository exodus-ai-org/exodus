import { isIP } from 'net'

import type { Context, Next } from 'hono'

import { logger } from '../../logger'

/**
 * The server has no authentication and listens on every interface (exodus-ios
 * reaches it over the LAN), and its API hands out the saved provider keys and
 * can run the `terminal` tool. A browser is the one client that will talk to it
 * on someone else's behalf: any page the user has open can `fetch()`
 * `http://localhost:60223`. These two checks turn that away without touching a
 * legitimate client — they do not make the LAN exposure itself safe (that needs
 * a pairing token; see docs/security-hardening.md).
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * A request may carry no `Origin`, or a loopback web origin — nothing else.
 *
 * No `Origin` is every legitimate client but one: exodus-ios, exodus-cli, curl,
 * the API tests, and the packaged renderer itself — measured, not assumed: a
 * `file://` page in Electron sends none, on GET, JSON POST and PUT alike, and
 * is not preflighted. The one client that does send it is the dev renderer
 * (`http://localhost:5173`).
 *
 * So `null` is refused: Exodus never sends it, and it is what a sandboxed
 * iframe on a hostile page would present. Likewise any other scheme
 * (`chrome-extension://…` — a browser extension reaching for the API).
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  return LOOPBACK_HOSTNAMES.has(url.hostname)
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  return (
    address === '::1' ||
    address.startsWith('127.') ||
    address.startsWith('::ffff:127.')
  )
}

/**
 * DNS rebinding: a page on `evil.example:60223` re-points its own name at
 * 127.0.0.1, and its now same-origin requests arrive with no `Origin` header
 * to check. What gives it away is the pairing — a connection from this machine
 * that addresses the server by a public name. Only loopback peers are held to
 * it, so exodus-ios may use whatever name the user gave it (an IP, `mac.local`,
 * a tailnet name); loopback clients get `localhost`, an IP literal or `.local`.
 */
export function isAllowedHost(
  host: string | undefined,
  remoteAddress: string | undefined
): boolean {
  if (!host || !isLoopbackAddress(remoteAddress)) return true
  let hostname: string
  try {
    hostname = new URL(`http://${host}`).hostname
  } catch {
    return false
  }
  if (LOOPBACK_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
    return true
  }
  return isIP(hostname.replace(/^\[|\]$/g, '')) !== 0
}

interface NodeBindings {
  incoming?: { socket?: { remoteAddress?: string } }
}

export async function originGate(c: Context, next: Next) {
  const origin = c.req.header('origin')
  const host = c.req.header('host')
  // `c.env` is @hono/node-server's bindings; absent under `app.request()`.
  const remoteAddress = (c.env as NodeBindings | undefined)?.incoming?.socket
    ?.remoteAddress

  if (!isAllowedOrigin(origin) || !isAllowedHost(host, remoteAddress)) {
    logger.warn('server', 'Rejected a request from a foreign origin', {
      origin,
      host,
      path: c.req.path
    })
    return c.json(
      {
        type: 'error',
        error: {
          code: 'FORBIDDEN_ORIGIN',
          message: 'This origin may not call the Exodus API.'
        }
      },
      403
    )
  }
  return next()
}
