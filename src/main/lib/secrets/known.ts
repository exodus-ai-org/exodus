import { getAllMcpServers } from '../db/mcp-queries'
import { getSettings } from '../db/queries'
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

/**
 * Every secret value Exodus holds right now, in plaintext: the settings
 * registry fields and each MCP server's `env` / `headers` values and
 * `extraConfig` secrets. For scrubbing copies of old text (`scrub.ts`); never
 * leaves the process.
 */
export async function knownSecretValues(): Promise<string[]> {
  const out: string[] = []
  const settings = await getSettings()
  for (const path of SETTINGS_SECRET_PATHS) {
    const v = getAtPath(settings, path)
    if (typeof v === 'string' && v) out.push(v)
  }
  for (const server of await getAllMcpServers()) {
    secretStrings(server.env, true, out)
    secretStrings(server.headers, true, out)
    secretStrings(server.extraConfig, false, out)
  }
  return out
}
