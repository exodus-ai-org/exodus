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
 * The plaintext secrets of a decrypted MCP row: `env` / `headers` values,
 * `extraConfig` secrets, and the secrets inside its `url` / `args`.
 */
export function mcpServerSecretValues(
  server: Pick<McpServer, 'env' | 'headers' | 'extraConfig' | 'url' | 'args'>
): string[] {
  const out: string[] = []
  secretStrings(server.env, true, out)
  secretStrings(server.headers, true, out)
  secretStrings(server.extraConfig, false, out)
  out.push(...mcpLocatorSecrets(server.url, server.args as string[] | null))
  return out
}
