import type { CurrentPlaintext, McpSecretsPlaintext } from './current'
import { maskSecret, resolvePostedSecret, looksLikeMask } from './mask'
import {
  API_MASKED_SETTINGS_PATHS,
  MCP_KEY_NAMED_SECRET_COLUMNS,
  MCP_SECRET_RECORD_COLUMNS,
  SECRET_NAME_PATTERN,
  SETTINGS_SECRET_PATHS
} from './registry'
import { isPlainObject, parentOf } from './tree'

export { maskSecret, looksLikeMask, resolvePostedSecret } from './mask'
export { settingsPlaintext, mcpPlaintext } from './current'
export type { CurrentPlaintext, McpSecretsPlaintext } from './current'

/**
 * A write failure without the values it tried to write. Drizzle's query error
 * message carries the statement's `params` — API keys, MCP tokens — and it
 * would otherwise reach the API response (`handleDatabaseOperation` passes
 * `error.message` on) and the log. Only Postgres's SQLSTATE survives — its
 * message can quote a value too (`invalid input syntax for type …: "…"`).
 */
export function secretSafeWriteError(what: string, error: unknown): Error {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  return new Error(
    typeof code === 'string' ? `${what} (SQLSTATE ${code})` : what
  )
}

/**
 * A base URL in a comparable form: trimmed, scheme and host lowercased, no
 * trailing slash. `null` for an empty one ("use the stored / default").
 */
export function normalizeBaseUrl(
  url: string | null | undefined
): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/u, '')}${u.search}`
  } catch {
    return trimmed.replace(/\/+$/u, '')
  }
}

// ─── settings ────────────────────────────────────────────────────────────────

/**
 * A copy of the settings with every registry field masked (bar the
 * `API_PLAINTEXT_EXCEPTIONS`) — what the API serializes. The in-process
 * settings stay plaintext.
 */
export function maskSettings<T extends object>(settings: T): T {
  const copy = structuredClone(settings)
  for (const path of API_MASKED_SETTINGS_PATHS) {
    const at = parentOf(copy, path)
    if (at && at.key in at.parent) {
      const v = at.parent[at.key]
      at.parent[at.key] = typeof v === 'string' ? maskSecret(v) : v
    }
  }
  return copy
}

/**
 * A copy of a settings write (the whole row, or `{ [column]: value }`) where
 * every posted mask is swapped back for the stored plaintext. `null` / `""`
 * and new values pass through untouched; a section that was not sent stays
 * unsent.
 */
export function restoreSettingsSecrets<T extends object>(
  payload: T,
  current: CurrentPlaintext
): T {
  const copy = structuredClone(payload)
  for (const path of SETTINGS_SECRET_PATHS) {
    const at = parentOf(copy, path)
    if (!at || !looksLikeMask(at.parent[at.key])) continue
    at.parent[at.key] = resolvePostedSecret(
      at.parent[at.key] as string,
      current(path)
    )
  }
  return copy
}

/** Whether a settings column holds a registry field (so a write needs care). */
export function settingsColumnHasSecrets(column: string): boolean {
  return SETTINGS_SECRET_PATHS.some(
    (p) => p === column || p.startsWith(`${column}.`)
  )
}

// ─── mcp_server ──────────────────────────────────────────────────────────────

type McpSecretColumns = {
  env?: Record<string, string> | null
  headers?: Record<string, string> | null
  extraConfig?: Record<string, unknown> | null
}

function maskKeyNamed(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => maskKeyNamed(v))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      SECRET_NAME_PATTERN.test(k) && typeof v === 'string'
        ? maskSecret(v)
        : maskKeyNamed(v)
    ])
  )
}

function restoreKeyNamed(posted: unknown, stored: unknown): unknown {
  if (Array.isArray(posted)) {
    return posted.map((v, i) =>
      restoreKeyNamed(v, Array.isArray(stored) ? stored[i] : undefined)
    )
  }
  if (!isPlainObject(posted)) return posted
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(posted)) {
    const was = isPlainObject(stored) ? stored[k] : undefined
    if (SECRET_NAME_PATTERN.test(k) && looksLikeMask(v)) {
      // A mask under a key that held no string is dropped, never stored.
      if (typeof was === 'string') out[k] = was
      continue
    }
    out[k] = restoreKeyNamed(v, was)
  }
  return out
}

/** A copy of an `mcp_server` row with its secrets masked, for the API. */
export function maskMcpServer<T extends McpSecretColumns>(row: T): T {
  const copy = { ...row }
  for (const col of MCP_SECRET_RECORD_COLUMNS) {
    const rec = copy[col]
    if (isPlainObject(rec)) {
      copy[col] = Object.fromEntries(
        Object.entries(rec).map(([k, v]) => [k, maskSecret(v) ?? v])
      )
    }
  }
  for (const col of MCP_KEY_NAMED_SECRET_COLUMNS) {
    if (copy[col]) {
      copy[col] = maskKeyNamed(copy[col]) as Record<string, unknown>
    }
  }
  return copy
}

/**
 * A copy of an MCP create/update body with every posted mask swapped back for
 * the stored plaintext (`current` is the row being updated; empty for a
 * create). A mask under a name the stored row does not have is dropped.
 * Columns not sent stay unsent; `null` clears.
 */
export function restoreMcpSecrets<T extends McpSecretColumns>(
  body: T,
  current: McpSecretsPlaintext
): T {
  const copy = { ...body }
  for (const col of MCP_SECRET_RECORD_COLUMNS) {
    const rec = copy[col]
    if (!isPlainObject(rec)) continue
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      if (!looksLikeMask(v)) {
        out[k] = v
        continue
      }
      const was = current[col]?.[k]
      if (typeof was === 'string') out[k] = was
    }
    copy[col] = out
  }
  for (const col of MCP_KEY_NAMED_SECRET_COLUMNS) {
    if (copy[col]) {
      copy[col] = restoreKeyNamed(copy[col], current[col]) as Record<
        string,
        unknown
      >
    }
  }
  return copy
}
