import type { McpServer, Settings } from '../db/schema'
import type { SettingsSecretPath } from './registry'
import { getAtPath } from './tree'

/**
 * The write path's view of what is stored now, as plaintext — the seam S2
 * re-implements when the registry fields are stored encrypted.
 *
 * Every "a posted mask means unchanged" decision (`resolvePostedSecret`) reads
 * the stored value through one of these accessors, never through the row
 * directly. Today the in-process settings (`getSettings()`) and `mcp_server`
 * rows are plaintext, so the accessors just read them; once the columns hold
 * `enc:v1:…`, S2 either decrypts in `getSettings()` / the MCP queries (and
 * these stay as they are) or decrypts here — either way the rule itself does
 * not change, and a ciphertext is never what a mask gets swapped back to.
 */
export type CurrentPlaintext = (path: SettingsSecretPath) => string | null

export function settingsPlaintext(
  stored: Settings | null | undefined
): CurrentPlaintext {
  return (path) => {
    const v = getAtPath(stored, path)
    return typeof v === 'string' ? v : null
  }
}

/** The stored secrets of one `mcp_server` row, as plaintext (S2 seam too). */
export interface McpSecretsPlaintext {
  env: Record<string, string> | null
  headers: Record<string, string> | null
  extraConfig: Record<string, unknown> | null
}

export function mcpPlaintext(
  stored: Pick<McpServer, 'env' | 'headers' | 'extraConfig'> | null | undefined
): McpSecretsPlaintext {
  return {
    env: stored?.env ?? null,
    headers: stored?.headers ?? null,
    extraConfig: stored?.extraConfig ?? null
  }
}
