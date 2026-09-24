import { ErrorCode } from '@exodus/shared/constants/error-codes'
import { ValidationError } from '@exodus/shared/errors/app-error'

import { maskSecret } from './mask'
import { isSecretName } from './registry'

// ─── secrets inside an MCP url / args (review S1 I2, N3) ─────────────────────

const URL_PARTS =
  /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/iu
const CAPABILITY_SEGMENT = /^[\w-]{24,}$/u
// Base64-ish (`=`, `+`, `.`): only when long, so a dotted file name is not one.
const BASE64_SEGMENT = /^[\w\-=+.]{32,}$/u
const ENV_REFERENCE = /^\$\{?[A-Za-z_]\w*\}?$/u
/** The bullets every mask starts with; a value holding them is not a key. */
export const MASK_TOKEN = '••••'

/** A long mixed letters-and-digits path segment: a capability-URL secret. */
function isCapabilitySegment(segment: string): boolean {
  return (
    (CAPABILITY_SEGMENT.test(segment) || BASE64_SEGMENT.test(segment)) &&
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
  const host =
    at === -1 ? authority : `${MASK_TOKEN}@${authority.slice(at + 1)}`
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

// An auth scheme stays visible (`Authorization: Bearer •••• abcd`).
const AUTH_SCHEME = /^(Bearer|Basic|Token|Bot|Digest)\s+(\S.*)$/iu

/** `Name: value` with the value masked when the header name is a secret's. */
function maskHeaderArg(header: string): string {
  const colon = header.indexOf(':')
  if (colon <= 0) return header
  const name = header.slice(0, colon).trim()
  const value = header.slice(colon + 1).trim()
  if (!isSecretName(name) || !value || ENV_REFERENCE.test(value)) return header
  const scheme = AUTH_SCHEME.exec(value)
  if (scheme && !ENV_REFERENCE.test(scheme[2]!)) {
    return `${name}: ${scheme[1]} ${maskSecret(scheme[2]!)}`
  }
  return `${name}: ${maskSecret(value)}`
}

const NAME_VALUE = /^([A-Za-z_][\w.-]*)=(.*)$/su

/**
 * A free-standing value: `NAME=value` with a secret name has its value
 * masked (`-e GITHUB_PERSONAL_ACCESS_TOKEN=…`, `--env API_KEY=…`); anything
 * else is looked at as a URL.
 */
function maskLooseValue(value: string): string {
  const nv = NAME_VALUE.exec(value)
  if (nv && isSecretName(nv[1]!)) return `${nv[1]}=${maskArgValue(nv[2]!)}`
  return maskMcpUrl(value)!
}

const FLAG = /^(--?[A-Za-z][\w-]*)(?:=(.*))?$/su
const SHORT_HEADER = /^-H(\S.*)$/su
const HEADER_FLAGS = new Set(['header', 'headers', 'H'])
// `-p` is a password only right after a user flag (`-u root -p …`); on its
// own it is far more often a port, so it is not masked then.
const USER_FLAGS = new Set(['-u', '--user', '--username'])

/** One argument, or a flag with the value it takes, as it is shown. */
interface ArgGroup {
  raw: string[]
  shown: string[]
}

function scanArgs(args: string[]): ArgGroup[] {
  const groups: ArgGroup[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const one = (shown: string) => groups.push({ raw: [arg], shown: [shown] })
    const shortHeader = SHORT_HEADER.exec(arg)
    if (shortHeader && shortHeader[1]!.includes(':')) {
      one(`-H${maskHeaderArg(shortHeader[1]!)}`)
      continue
    }
    const flag = FLAG.exec(arg)
    if (!flag) {
      one(maskLooseValue(arg))
      continue
    }
    const [, name, inline] = flag
    const bare = name!.replace(/^-+/u, '')
    const isHeader = HEADER_FLAGS.has(bare)
    const afterUser = i >= 2 && USER_FLAGS.has(args[i - 2]!)
    const isSecret =
      !isHeader && (isSecretName(bare) || (name === '-p' && afterUser))
    if (inline !== undefined) {
      if (isHeader) one(`${name}=${maskHeaderArg(inline)}`)
      else if (isSecret) one(`${name}=${maskArgValue(inline)}`)
      else one(`${name}=${maskLooseValue(inline)}`)
      continue
    }
    const next = args[i + 1]
    if (
      (isHeader || isSecret) &&
      next !== undefined &&
      !next.startsWith('--')
    ) {
      groups.push({
        raw: [arg, next],
        shown: [arg, isHeader ? maskHeaderArg(next) : maskArgValue(next)]
      })
      i++
      continue
    }
    one(arg)
  }
  return groups
}

const carriesSecret = (g: ArgGroup) => g.shown.some((s, i) => s !== g.raw[i])

/**
 * An MCP server's `args` as the API shows them: the value of a secret-named
 * flag (`--api-key=…`, `--token …`, `-p` after `-u`), of a secret header
 * (`--header`/`--headers`/`-H` `"Authorization: Bearer …"`, `X-Api-Key`,
 * `Cookie`), of a secret `NAME=value`, and secrets inside a URL — on its own
 * or as a flag's inline value — are masked. An env reference (`$TOKEN`,
 * `${AUTH}`) is left, since it is not the secret. A JSON-valued argument
 * (`--config '{"apiKey":…}'`) is NOT looked into (a known residual).
 */
export function maskMcpArgs(
  args: string[] | null | undefined
): string[] | null {
  if (args === null || args === undefined) return null
  return scanArgs(args).flatMap((g) => g.shown)
}

/**
 * `args` without the secrets in them: every argument (with its flag) that
 * `maskMcpArgs` would mask is left out. What stored args become when the
 * command they are handed to changes and nothing new was posted (N1).
 */
export function stripMcpArgs(
  args: string[] | null | undefined
): string[] | null {
  if (args === null || args === undefined) return null
  return scanArgs(args)
    .filter((g) => !carriesSecret(g))
    .flatMap((g) => g.raw)
}

/** Whether stored args carry any secret `maskMcpArgs` would hide. */
export function argsCarrySecrets(args: string[] | null | undefined): boolean {
  return !!args && scanArgs(args).some((g) => carriesSecret(g))
}

/** 400 for a value that holds a mask it cannot be restored from (N2). */
export function refuseMask(where: string): never {
  throw new ValidationError(
    ErrorCode.VALIDATION_FAILED,
    `Re-enter the secret: the ${where} still holds a masked value (${MASK_TOKEN})`
  )
}

const holdsMask = (v: unknown): boolean =>
  typeof v === 'string' && v.includes(MASK_TOKEN)

/**
 * A posted `url` / `args` equal to the stored one's mask is the stored one
 * (the form posts back what it was shown). One that still holds a mask
 * without being that exact mask — a url edited around its masked query, args
 * with one more flag — is refused (400), never stored (N2). `restoreArgs`
 * false (the command changed, N1): posted args that hold a mask are refused
 * even when they are the exact mask.
 */
export function restoreMcpLocators<
  T extends { url?: string | null; args?: string[] | null }
>(
  body: T,
  stored: { url?: string | null; args?: string[] | null } | null | undefined,
  { restoreArgs = true }: { restoreArgs?: boolean } = {}
): T {
  const copy = { ...body }
  if (holdsMask(copy.url)) {
    if (
      typeof stored?.url === 'string' &&
      copy.url === maskMcpUrl(stored.url)
    ) {
      copy.url = stored.url
    } else {
      refuseMask('url')
    }
  }
  if (Array.isArray(copy.args) && copy.args.some((a) => holdsMask(a))) {
    if (
      restoreArgs &&
      Array.isArray(stored?.args) &&
      JSON.stringify(copy.args) === JSON.stringify(maskMcpArgs(stored.args))
    ) {
      copy.args = stored.args
    } else {
      refuseMask('args')
    }
  }
  return copy
}

/** A create may hold no mask anywhere: there is nothing to restore it from. */
export function refuseMasksOnCreate(body: {
  url?: string | null
  args?: string[] | null
  env?: Record<string, string> | null
  headers?: Record<string, string> | null
  extraConfig?: Record<string, unknown> | null
}): void {
  const anyMask = (v: unknown): boolean =>
    holdsMask(v) ||
    (Array.isArray(v) && v.some((x) => anyMask(x))) ||
    (typeof v === 'object' && v !== null && Object.values(v).some((x) => anyMask(x)))
  for (const col of ['url', 'args', 'env', 'headers', 'extraConfig'] as const) {
    if (anyMask(body[col])) refuseMask(col)
  }
}
