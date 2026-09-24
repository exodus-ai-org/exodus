import type { McpServer } from '../db/schema'
import { decryptSecret, encryptSecret } from './crypto'
import { mcpPlaintext, type McpSecretsPlaintext } from './current'
import { restoreSettingsSecrets, settingsPlaintext } from './index'
import { looksLikeMask } from './mask'
import {
  MCP_KEY_NAMED_SECRET_COLUMNS,
  MCP_SECRET_DESTINATIONS,
  MCP_SECRET_RECORD_COLUMNS,
  SECRET_DESTINATIONS,
  SECRET_NAME_PATTERN,
  SETTINGS_SECRET_PATHS,
  type SettingsSecretPath
} from './registry'
import { getAtPath, isPlainObject, parentOf } from './tree'
import { normalizeBaseUrl } from './url'

/**
 * Secrets at rest (spec 2026-09-25 §2.3). The `settings` row and `mcp_server`
 * rows hold every registry secret as `enc:v1:…`; the queries decrypt a row as
 * it is read (so the in-process settings, and everything the S1 mask / restore
 * rules see, are plaintext) and encrypt a write just before it reaches the
 * database. A value that does not decrypt reads as unset and is reported for
 * re-entry (`status.ts`).
 */

// ─── settings ────────────────────────────────────────────────────────────────

/** The stored row, what it decrypts to, and which secrets would not open. */
export interface StoredSettingsState<T extends object = object> {
  raw: T
  plain: T
  undecryptable: SettingsSecretPath[]
}

export function decryptSettingsRow<T extends object>(
  raw: T
): StoredSettingsState<T> {
  const plain = structuredClone(raw)
  const undecryptable: SettingsSecretPath[] = []
  for (const path of SETTINGS_SECRET_PATHS) {
    const at = parentOf(plain, path)
    const v = at?.parent[at.key]
    if (!at || typeof v !== 'string') continue
    const out = decryptSecret(v)
    if (out.ok) {
      at.parent[at.key] = out.value
    } else {
      at.parent[at.key] = null
      undecryptable.push(path)
    }
  }
  return { raw, plain, undecryptable }
}

/** Encrypts every registry value present in `obj`, in place; how many. */
export function encryptSettingsSecretsInPlace(obj: object): number {
  let changed = 0
  for (const path of SETTINGS_SECRET_PATHS) {
    const at = parentOf(obj, path)
    const v = at?.parent[at.key]
    if (!at || typeof v !== 'string') continue
    const sealed = encryptSecret(v)
    if (sealed !== v) {
      at.parent[at.key] = sealed
      changed++
    }
  }
  return changed
}

const isUnset = (v: unknown): boolean =>
  v === null || v === undefined || v === ''

const asUrl = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v : null

/**
 * A settings write (the whole row, or `{ [column]: value }`) in the form it is
 * stored in:
 *
 * 1. A secret whose destination moves (`SECRET_DESTINATIONS`) while it comes
 *    back as its mask — or unset, when the stored one would not decrypt — is
 *    cleared, never carried to the new host (ruling R1).
 * 2. Every other posted mask becomes the stored plaintext (S1's rule).
 * 3. A stored secret that would not decrypt, posted back unset, keeps its
 *    ciphertext: an unrelated save must not wipe it (it may open again — a
 *    keychain prompt denied once — and the re-entry notice stays up until the
 *    user types a new one).
 * 4. Every registry value is encrypted.
 */
export function prepareSettingsWrite<T extends object>(
  payload: T,
  stored: StoredSettingsState
): T {
  const copy = structuredClone(payload)
  const moved = new Set<string>()
  for (const [path, dest] of Object.entries(SECRET_DESTINATIONS)) {
    const at = parentOf(copy, path)
    if (!at) continue
    const posted = at.parent[at.key]
    const unopened =
      isUnset(posted) &&
      stored.undecryptable.includes(path as SettingsSecretPath)
    if (!looksLikeMask(posted) && !unopened) continue
    const destAt = parentOf(copy, dest.field)
    const before = asUrl(getAtPath(stored.plain, dest.field)) ?? dest.fallback
    const after =
      asUrl(destAt ? destAt.parent[destAt.key] : undefined) ?? dest.fallback
    if (normalizeBaseUrl(before) !== normalizeBaseUrl(after)) {
      at.parent[at.key] = null
      moved.add(path)
    }
  }

  const restored = restoreSettingsSecrets(
    copy,
    settingsPlaintext(stored.plain as never)
  )

  for (const path of stored.undecryptable) {
    if (moved.has(path)) continue
    const at = parentOf(restored, path)
    if (!at) continue
    if (isUnset(at.parent[at.key])) {
      at.parent[at.key] = getAtPath(stored.raw, path)
    }
  }

  encryptSettingsSecretsInPlace(restored)
  return restored
}

// ─── mcp_server ──────────────────────────────────────────────────────────────

type McpSecretColumns = {
  env?: Record<string, string> | null
  headers?: Record<string, string> | null
  extraConfig?: Record<string, unknown> | null
}

/**
 * Every secret-named string inside `value` (any depth) through `fn`; a `null`
 * answer drops the key. `path` is the dotted route to each one.
 */
function mapKeyNamed(
  value: unknown,
  fn: (s: string, path: string) => string | null,
  path: string
): unknown {
  if (Array.isArray(value)) {
    return value.map((v, i) => mapKeyNamed(v, fn, `${path}.${i}`))
  }
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_NAME_PATTERN.test(k) && typeof v === 'string') {
      const mapped = fn(v, `${path}.${k}`)
      if (mapped !== null) out[k] = mapped
    } else {
      out[k] = mapKeyNamed(v, fn, `${path}.${k}`)
    }
  }
  return out
}

/** Every MCP secret of a row (or write) through `fn`, as a copy. */
function mapMcpSecrets<T extends McpSecretColumns>(
  row: T,
  fn: (s: string, label: string) => string | null
): T {
  const copy = { ...row }
  for (const col of MCP_SECRET_RECORD_COLUMNS) {
    const rec = copy[col]
    if (!isPlainObject(rec)) continue
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      const mapped = typeof v === 'string' ? fn(v, `${col}.${k}`) : v
      if (mapped !== null) out[k] = mapped
    }
    copy[col] = out
  }
  for (const col of MCP_KEY_NAMED_SECRET_COLUMNS) {
    if (copy[col]) {
      copy[col] = mapKeyNamed(copy[col], fn, col) as Record<string, unknown>
    }
  }
  return copy
}

/**
 * A row as the app uses it: every secret decrypted; one that will not open is
 * left out (so it reads as unset) and listed by `<column>.<name>`.
 */
export function decryptMcpRow<T extends McpSecretColumns>(
  row: T
): { plain: T; undecryptable: string[] } {
  const undecryptable: string[] = []
  const plain = mapMcpSecrets(row, (v, label) => {
    const out = decryptSecret(v)
    if (out.ok) return out.value
    undecryptable.push(label)
    return null
  })
  return { plain, undecryptable }
}

/** A write in its stored form, and how many values it encrypted. */
export function encryptMcpSecrets<T extends McpSecretColumns>(
  body: T
): { sealed: T; changed: number } {
  let changed = 0
  const sealed = mapMcpSecrets(body, (v) => {
    const out = encryptSecret(v)
    if (out !== v) changed++
    return out
  })
  return { sealed, changed }
}

/**
 * The stored secrets a posted mask may stand for (`restoreMcpSecrets`), minus
 * those whose destination the same write moves: `headers` / `extraConfig`
 * posted as masks with a new `url`, `env` with a new `command`, are dropped
 * rather than carried along (the MCP form of ruling R1).
 */
export function mcpPlaintextForWrite(
  body: { url?: string | null; command?: string | null },
  stored:
    | Pick<McpServer, 'env' | 'headers' | 'extraConfig' | 'url' | 'command'>
    | null
    | undefined
): McpSecretsPlaintext {
  const current = mcpPlaintext(stored)
  if (!stored) return current
  for (const [col, destField] of Object.entries(MCP_SECRET_DESTINATIONS) as [
    keyof McpSecretsPlaintext,
    'url' | 'command'
  ][]) {
    const posted = body[destField]
    if (posted === undefined) continue
    if (normalizeBaseUrl(posted) !== normalizeBaseUrl(stored[destField])) {
      current[col] = null
    }
  }
  return current
}
