import { lookup as dnsLookup } from 'dns/promises'
import type { IncomingMessage } from 'http'
import { request } from 'https'
import { isIP, isIPv4, isIPv6 } from 'net'

/**
 * Fetching a URL that someone else chose — an images API's link, whose base
 * URL is a user setting a paired phone can change too — without letting it
 * reach this machine or its networks: the app's own API on loopback (which
 * trusts loopback), the LAN, link-local cloud metadata (169.254.169.254).
 *
 * - `https:` only, every hop.
 * - Redirects are followed here (at most `maxRedirects`), each one checked
 *   like the first.
 * - A host is refused if it is `localhost` / `*.localhost`, a literal
 *   address that is not public, or a name for which ANY resolved address is
 *   not public.
 * - The connection is pinned to the addresses that were checked (a custom
 *   `lookup` on the request), so a DNS answer that changes between the
 *   check and the connect (rebinding) is never used.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(`Refused: ${message}`)
    this.name = 'UnsafeUrlError'
  }
}

type Bytes = number[]

function v4Bytes(ip: string): Bytes | null {
  if (!isIPv4(ip)) return null
  return ip.split('.').map(Number)
}

/** The 16 bytes of an IPv6 address (zone id dropped), or null. */
function v6Bytes(input: string): Bytes | null {
  const ip = input.split('%')[0]
  if (!isIPv6(ip)) return null
  let head = ip
  const tail: Bytes = []
  // A trailing dotted quad (`::ffff:127.0.0.1`) is the last 32 bits.
  const dotted = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    head = dotted[1].endsWith('::') ? dotted[1] : dotted[1].slice(0, -1)
    const v4 = v4Bytes(dotted[2])
    if (!v4) return null
    tail.push(...v4)
  }
  const groupsWanted = (16 - tail.length) / 2
  const [left, right] = head.includes('::') ? head.split('::') : [head, null]
  const parse = (s: string) => (s ? s.split(':') : [])
  const l = parse(left)
  const r = right === null ? [] : parse(right)
  const fill = right === null ? 0 : groupsWanted - l.length - r.length
  const groups = [...l, ...Array<string>(fill).fill('0'), ...r]
  if (groups.length !== groupsWanted) return null
  const bytes: Bytes = []
  for (const g of groups) {
    const n = parseInt(g, 16)
    bytes.push(n >> 8, n & 0xff)
  }
  return [...bytes, ...tail]
}

/** Does `bytes` start with the `bits`-long prefix `prefix`? */
function inPrefix(bytes: Bytes, prefix: Bytes, bits: number): boolean {
  for (let i = 0; i < bits; i += 8) {
    const take = Math.min(8, bits - i)
    const mask = (0xff << (8 - take)) & 0xff
    if ((bytes[i / 8] & mask) !== ((prefix[i / 8] ?? 0) & mask)) return false
  }
  return true
}

// Everything that is not the public internet (IANA special-purpose registry).
const V4_BLOCKED: Array<[Bytes, number]> = [
  [[0, 0, 0, 0], 8], // "this network", unspecified
  [[10, 0, 0, 0], 8], // private
  [[100, 64, 0, 0], 10], // CGNAT
  [[127, 0, 0, 0], 8], // loopback
  [[169, 254, 0, 0], 16], // link-local, cloud metadata
  [[172, 16, 0, 0], 12], // private
  [[192, 0, 0, 0], 24], // IETF protocol assignments
  [[192, 0, 2, 0], 24], // documentation
  [[192, 88, 99, 0], 24], // 6to4 relay anycast
  [[192, 168, 0, 0], 16], // private
  // 198.18.0.0/15 (benchmarking) is deliberately NOT here: a proxy in TUN
  // "fake-ip" mode (Clash, Surge, sing-box) answers every name with an
  // address from it, and refusing it would refuse every download there.
  [[198, 51, 100, 0], 24], // documentation
  [[203, 0, 113, 0], 24], // documentation
  [[224, 0, 0, 0], 4], // multicast
  [[240, 0, 0, 0], 4] // reserved, broadcast
]

function isPublicV4(b: Bytes): boolean {
  return !V4_BLOCKED.some(([p, bits]) => inPrefix(b, p, bits))
}

// Inside global unicast (2000::/3), the ranges that are not a real host.
// (2001::/32, Teredo, stays allowed: it cannot reach this machine or its
// LAN, and poisoned resolvers answer `2001::1` for many real hosts — refusing
// it would refuse those hosts outright.)
const V6_BLOCKED_GLOBAL: Array<[Bytes, number]> = [
  [[0x20, 0x01, 0x0d, 0xb8], 32], // documentation
  [[0x20, 0x02], 16], // 6to4: embeds any IPv4, private included
  [[0x3f, 0xff], 20] // documentation
]

function isPublicV6(b: Bytes): boolean {
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d): judge the IPv4.
  const mapped = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff]
  const nat64 = [0, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0]
  if (inPrefix(b, mapped, 96) || inPrefix(b, nat64, 96)) {
    return isPublicV4(b.slice(12))
  }
  // Only global unicast is public: this leaves out ::, ::1, the IPv4-
  // compatible ::/96, fc00::/7 (ULA), fe80::/10 (link-local), ff00::/8.
  if (!inPrefix(b, [0x20], 3)) return false
  return !V6_BLOCKED_GLOBAL.some(([p, bits]) => inPrefix(b, p, bits))
}

/**
 * Is `ip` an address on the public internet? False for loopback, private
 * (RFC 1918, fc00::/7), link-local (169.254/16 — cloud metadata — and
 * fe80::/10), CGNAT, unspecified, multicast, reserved and documentation
 * ranges, for an IPv4-mapped IPv6 address of any of those, and for anything
 * that is not an IP address.
 */
export function isPublicAddress(ip: string): boolean {
  const v4 = v4Bytes(ip)
  if (v4) return isPublicV4(v4)
  const v6 = v6Bytes(ip)
  if (v6) return isPublicV6(v6)
  return false
}

type Resolved = Array<{ address: string; family: number }>

/** The addresses a URL's host may be reached at — every one of them public. */
async function vetHost(url: URL): Promise<Resolved> {
  if (url.protocol !== 'https:') {
    throw new UnsafeUrlError(`${url.protocol} is not https`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
  const lower = host.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.localhost')) {
    throw new UnsafeUrlError(`${host} is local`)
  }
  const family = isIP(host)
  if (family) {
    if (!isPublicAddress(host)) {
      throw new UnsafeUrlError(`${host} is not a public address`)
    }
    return [{ address: host, family }]
  }
  const addrs = await dnsLookup(host, { all: true })
  if (addrs.length === 0) throw new UnsafeUrlError(`${host} has no address`)
  const bad = addrs.find((a) => !isPublicAddress(a.address))
  if (bad) {
    throw new UnsafeUrlError(
      `${host} resolves to ${bad.address}, not a public address`
    )
  }
  return addrs.map(({ address, family: f }) => ({ address, family: f }))
}

function get(
  url: URL,
  addrs: Resolved,
  signal: AbortSignal
): Promise<{ res: IncomingMessage; abort: (e: Error) => void }> {
  return new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        signal,
        // Pinned: the socket connects to an address vetHost checked, never
        // to a fresh DNS answer.
        lookup: (_host, options, cb) => {
          if ((options as { all?: boolean }).all) {
            ;(cb as (e: null, a: Resolved) => void)(null, addrs)
          } else {
            cb(null, addrs[0].address, addrs[0].family)
          }
        }
      },
      (res) => resolvePromise({ res, abort: (e) => req.destroy(e) })
    )
    req.on('error', reject)
    req.end()
  })
}

async function readCapped(
  res: IncomingMessage,
  maxBytes: number,
  abort: (e: Error) => void
): Promise<Buffer> {
  const declared = Number(res.headers['content-length'])
  if (Number.isFinite(declared) && declared > maxBytes) {
    const e = new Error('image too large')
    abort(e)
    throw e
  }
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of res) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (total > maxBytes) {
      const e = new Error('image too large')
      abort(e)
      throw e
    }
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

export interface FetchPublicHttpsOptions {
  /** The body is refused past this many bytes. */
  maxBytes: number
  signal?: AbortSignal
  /** Covers every hop and the body. Default 60 s. */
  timeoutMs?: number
  /** Default 3. */
  maxRedirects?: number
}

/**
 * GETs `url` (see the module comment for what is refused) and returns its
 * body and content type. Throws `UnsafeUrlError` for a refused hop, an
 * `Error` for an HTTP error status, too many redirects, or a body over
 * `maxBytes`.
 */
export async function fetchPublicHttps(
  url: string,
  {
    maxBytes,
    signal,
    timeoutMs = 60_000,
    maxRedirects = 3
  }: FetchPublicHttpsOptions
): Promise<{ bytes: Buffer; contentType: string | null }> {
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let current: URL
  try {
    current = new URL(url)
  } catch {
    throw new UnsafeUrlError('not a URL')
  }
  for (let hop = 0; ; hop++) {
    const addrs = await vetHost(current)
    const { res, abort } = await get(current, addrs, combined)
    const status = res.statusCode ?? 0
    if (REDIRECTS.has(status)) {
      res.resume()
      const location = res.headers.location
      if (!location) throw new Error(`HTTP ${status} without a Location`)
      if (hop >= maxRedirects) throw new Error('too many redirects')
      try {
        current = new URL(location, current)
      } catch {
        throw new UnsafeUrlError('redirect to something that is not a URL')
      }
      continue
    }
    if (status < 200 || status >= 300) {
      res.resume()
      throw new Error(`HTTP ${status}`)
    }
    const bytes = await readCapped(res, maxBytes, abort)
    const type = res.headers['content-type']
    return { bytes, contentType: typeof type === 'string' ? type : null }
  }
}
