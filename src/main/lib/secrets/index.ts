import type { CurrentPlaintext, McpSecretsPlaintext } from './current'
import { MASK_TOKEN, maskMcpArgs, maskMcpUrl, refuseMask } from './locators'
import { maskSecret, resolvePostedSecret, looksLikeMask } from './mask'
import {
  API_MASKED_SETTINGS_PATHS,
  MCP_KEY_NAMED_SECRET_COLUMNS,
  MCP_SECRET_RECORD_COLUMNS,
  SETTINGS_SECRET_PATHS,
  isSecretName
} from './registry'
import { isPlainObject, parentOf } from './tree'

export { maskSecret, looksLikeMask, resolvePostedSecret } from './mask'
export { settingsPlaintext, mcpPlaintext } from './current'
export { normalizeBaseUrl } from './url'
export {
  maskMcpArgs,
  maskMcpUrl,
  refuseMasksOnCreate,
  restoreMcpLocators
} from './locators'
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
  url?: string | null
  args?: string[] | null
}

const DROP = Symbol('drop')

/**
 * `extraConfig` as the API shows it: under a secret-named key (`isSecretName`)
 * every string and number leaf is masked — a `tokens: { access, expiresIn }`
 * object as much as an `apiKey` string.
 */
function maskTree(value: unknown, secret: boolean): unknown {
  if (Array.isArray(value)) return value.map((v) => maskTree(v, secret))
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        maskTree(v, secret || isSecretName(k))
      ])
    )
  }
  if (secret && (typeof value === 'string' || typeof value === 'number')) {
    return maskSecret(String(value)) ?? value
  }
  return value
}

/** Identity keys an `extraConfig` array item may be matched back by. */
const ITEM_IDENTITY_KEYS = ['id', 'name'] as const

/**
 * The stored item a posted array item stands for. An item with an `id` /
 * `name` is matched by it wherever it moved; one without is matched only
 * when it is exactly the stored item at the same index, as shown — so a
 * reordered or edited identity-less item gets no secrets back (the user
 * re-sends them) rather than a secret landing next to another item's URL.
 */
function storedItemFor(
  posted: unknown,
  index: number,
  stored: unknown[],
  secret: boolean
): unknown {
  if (isPlainObject(posted)) {
    for (const key of ITEM_IDENTITY_KEYS) {
      const id = posted[key]
      if (typeof id !== 'string' && typeof id !== 'number') continue
      const hits = stored.filter((s) => isPlainObject(s) && s[key] === id)
      return hits.length === 1 ? hits[0] : undefined
    }
  }
  const candidate = stored[index]
  return JSON.stringify(maskTree(candidate, secret)) === JSON.stringify(posted)
    ? candidate
    : undefined
}

/** The inverse of `maskTree`: a posted mask becomes the stored leaf. */
function restoreTree(
  posted: unknown,
  stored: unknown,
  secret: boolean
): unknown {
  if (secret && looksLikeMask(posted)) {
    // A mask with nothing stored behind it is dropped, never stored.
    return typeof stored === 'string' || typeof stored === 'number'
      ? stored
      : DROP
  }
  if (Array.isArray(posted)) {
    const was = Array.isArray(stored) ? stored : []
    return posted
      .map((v, i) => restoreTree(v, storedItemFor(v, i, was, secret), secret))
      .filter((v) => v !== DROP)
  }
  if (isPlainObject(posted)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(posted)) {
      const r = restoreTree(
        v,
        isPlainObject(stored) ? stored[k] : undefined,
        secret || isSecretName(k)
      )
      if (r !== DROP) out[k] = r
    }
    return out
  }
  return posted
}

/**
 * A stored secret column with its secrets taken out: `env` / `headers` keep
 * no value, `extraConfig` keeps everything that is not a secret. What a column
 * becomes when its destination moves and nothing new was posted for it.
 */
export function stripMcpSecrets(
  col: 'env' | 'headers' | 'extraConfig',
  value: Record<string, unknown> | null | undefined
): Record<string, never> | Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  if (col !== 'extraConfig') return {}
  return restoreTree(maskTree(value, false), undefined, false) as Record<
    string,
    unknown
  >
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
      copy[col] = maskTree(copy[col], false) as Record<string, unknown>
    }
  }
  if (typeof copy.url === 'string') copy.url = maskMcpUrl(copy.url)
  if (Array.isArray(copy.args)) copy.args = maskMcpArgs(copy.args)
  return copy
}

/**
 * A copy of an MCP create/update body with every posted mask swapped back for
 * the stored plaintext (`current` is the row being updated; empty for a
 * create). A mask under a name the stored row does not have is dropped.
 * Columns not sent stay unsent; `null` clears.
 */
/**
 * A secret value that holds the mask's bullets without being a mask — text
 * typed around a mask, or a mask pasted into a longer value — cannot be
 * restored and must never be stored: 400, like a url / args (S1 M-b).
 */
function refusePartialMasks(
  value: unknown,
  secret: boolean,
  col: 'env' | 'headers' | 'extraConfig'
): void {
  if (typeof value === 'string') {
    if (secret && value.includes(MASK_TOKEN) && !looksLikeMask(value)) {
      refuseMask(col)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) refusePartialMasks(v, secret, col)
    return
  }
  if (!isPlainObject(value)) return
  for (const [k, v] of Object.entries(value)) {
    refusePartialMasks(v, secret || isSecretName(k), col)
  }
}

export function restoreMcpSecrets<T extends McpSecretColumns>(
  body: T,
  current: McpSecretsPlaintext
): T {
  const copy = { ...body }
  for (const col of MCP_SECRET_RECORD_COLUMNS) {
    refusePartialMasks(copy[col], true, col)
  }
  for (const col of MCP_KEY_NAMED_SECRET_COLUMNS) {
    refusePartialMasks(copy[col], false, col)
  }
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
      copy[col] = restoreTree(copy[col], current[col], false) as Record<
        string,
        unknown
      >
    }
  }
  return copy
}
