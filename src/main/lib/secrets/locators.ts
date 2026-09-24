import { maskSecret } from './mask'
import { isSecretName } from './registry'

// ─── secrets inside an MCP url / args (review S1 I2) ─────────────────────────

const URL_PARTS =
  /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/iu
const CAPABILITY_SEGMENT = /^[\w-]{24,}$/u
const ENV_REFERENCE = /^\$\{?[A-Za-z_]\w*\}?$/u

/** A long mixed letters-and-digits path segment: a capability-URL secret. */
function isCapabilitySegment(segment: string): boolean {
  return (
    CAPABILITY_SEGMENT.test(segment) &&
    /[A-Za-z]/u.test(segment) &&
    /\d/u.test(segment)
  )
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replaceAll('+', ' '))
  } catch {
    return s
  }
}

/**
 * An MCP server URL as the API shows it: userinfo, the values of
 * secret-named query parameters and capability path segments masked. A URL
 * with none of those (or not a URL) comes back unchanged.
 */
export function maskMcpUrl(url: string | null | undefined): string | null {
  if (url === null || url === undefined) return null
  const m = URL_PARTS.exec(url)
  if (!m) return url
  const [, scheme, authority, path, query = '', fragment = ''] = m
  const at = authority.lastIndexOf('@')
  const host = at === -1 ? authority : `••••@${authority.slice(at + 1)}`
  const maskedPath = path
    .split('/')
    .map((seg) => (isCapabilitySegment(seg) ? maskSecret(seg)! : seg))
    .join('/')
  const maskedQuery = query
    ? `?${query
        .slice(1)
        .split('&')
        .map((pair) => {
          const eq = pair.indexOf('=')
          if (eq === -1) return pair
          const name = pair.slice(0, eq)
          const value = safeDecode(pair.slice(eq + 1))
          return isSecretName(safeDecode(name)) && value
            ? `${name}=${maskSecret(value)}`
            : pair
        })
        .join('&')}`
    : ''
  return `${scheme}${host}${maskedPath}${maskedQuery}${fragment}`
}

function maskArgValue(value: string): string {
  return value === '' || ENV_REFERENCE.test(value)
    ? value
    : (maskSecret(value) ?? value)
}

/** `Name: value` with the value masked when the header name is a secret's. */
function maskHeaderArg(header: string): string {
  const colon = header.indexOf(':')
  if (colon <= 0) return header
  const name = header.slice(0, colon).trim()
  const value = header.slice(colon + 1).trim()
  if (!isSecretName(name) || !value || ENV_REFERENCE.test(value)) return header
  return `${name}: ${maskSecret(value)}`
}

const FLAG = /^(--?[A-Za-z][\w-]*)(?:=(.*))?$/su

/**
 * An MCP server's `args` as the API shows them: the value of a secret-named
 * flag (`--api-key=…`, `--token …`), the value of a secret header
 * (`--header "Authorization: …"`, `X-Api-Key`, `Cookie`), and secrets inside
 * a URL argument are masked. An env reference (`$TOKEN`, `${AUTH}`) is left,
 * since it is not the secret.
 */
export function maskMcpArgs(
  args: string[] | null | undefined
): string[] | null {
  if (args === null || args === undefined) return null
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const flag = FLAG.exec(arg)
    if (!flag) {
      out.push(maskMcpUrl(arg)!)
      continue
    }
    const [, name, inline] = flag
    const bare = name.replace(/^-+/u, '')
    const isHeader = bare === 'header' || bare === 'H'
    const isSecret = !isHeader && isSecretName(bare)
    if (inline !== undefined) {
      if (isHeader) out.push(`${name}=${maskHeaderArg(inline)}`)
      else if (isSecret) out.push(`${name}=${maskArgValue(inline)}`)
      else out.push(arg)
      continue
    }
    const next = args[i + 1]
    if (
      (isHeader || isSecret) &&
      next !== undefined &&
      !next.startsWith('--')
    ) {
      out.push(arg, isHeader ? maskHeaderArg(next) : maskArgValue(next))
      i++
      continue
    }
    out.push(arg)
  }
  return out
}

/**
 * A posted `url` / `args` equal to the stored one's mask is the stored one
 * (the form posts back what it was shown); anything else is set as posted.
 * Run before S2's destination rule, so a masked url is not a "new host".
 */
export function restoreMcpLocators<
  T extends { url?: string | null; args?: string[] | null }
>(
  body: T,
  stored: { url?: string | null; args?: string[] | null } | null | undefined
): T {
  const copy = { ...body }
  if (!stored) return copy
  if (
    typeof copy.url === 'string' &&
    typeof stored.url === 'string' &&
    copy.url === maskMcpUrl(stored.url)
  ) {
    copy.url = stored.url
  }
  if (
    Array.isArray(copy.args) &&
    Array.isArray(stored.args) &&
    JSON.stringify(copy.args) === JSON.stringify(maskMcpArgs(stored.args))
  ) {
    copy.args = stored.args
  }
  return copy
}
