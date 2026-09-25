import type { McpServer } from '../db/schema'
import { mcpLocatorSecrets } from './locators'
import { isSecretName, SETTINGS_SECRET_PATHS } from './registry'
import { getAtPath, isPlainObject } from './tree'

function secretStrings(value: unknown, secret: boolean, out: string[]): void {
  if (typeof value === 'string') {
    if (secret && value) out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) secretStrings(v, secret, out)
    return
  }
  if (!isPlainObject(value)) return
  for (const [k, v] of Object.entries(value)) {
    secretStrings(v, secret || isSecretName(k), out)
  }
}

/** The plaintext registry values of a decrypted settings row. */
export function settingsSecretValues(settings: unknown): string[] {
  const out: string[] = []
  for (const path of SETTINGS_SECRET_PATHS) {
    const v = getAtPath(settings, path)
    if (typeof v === 'string' && v) out.push(v)
  }
  return out
}

/**
 * A value that reads as a key or token on its own: long, one word with no
 * path separator, letters and digits both. `PATH`, `HOME=/Users/…`,
 * `NODE_ENV=production` or `LOG_LEVEL=debug` are not.
 */
function looksLikeToken(value: string): boolean {
  return (
    value.length >= 16 &&
    /^[\w\-.~+=]+$/u.test(value) &&
    /[A-Za-z]/u.test(value) &&
    /\d/u.test(value)
  )
}

/**
 * The `env` values that are secrets: every one under a secret name
 * (`GITHUB_PERSONAL_ACCESS_TOKEN`, `DB_PASSWORD`), and one under any other
 * name only when it looks like a token itself. The API still masks every env
 * value (a name says nothing for sure); these are what the logger and the
 * copies are scrubbed of, where masking `PATH` or a home directory in every
 * line would wreck the logs (re-review m5).
 */
function envSecretValues(env: unknown, out: string[]): void {
  if (!isPlainObject(env)) return
  for (const [k, v] of Object.entries(env)) {
    if (typeof v !== 'string' || !v) continue
    if (isSecretName(k) || looksLikeToken(v)) out.push(v)
  }
}

/**
 * The plaintext secrets of a decrypted MCP row: `env` values that are
 * secrets (above), `headers` values, `extraConfig` secrets, and the secrets
 * inside its `url` / `args`.
 */
export function mcpServerSecretValues(
  server: Pick<McpServer, 'env' | 'headers' | 'extraConfig' | 'url' | 'args'>
): string[] {
  const out: string[] = []
  envSecretValues(server.env, out)
  secretStrings(server.headers, true, out)
  secretStrings(server.extraConfig, false, out)
  out.push(...mcpLocatorSecrets(server.url, server.args as string[] | null))
  return out
}
