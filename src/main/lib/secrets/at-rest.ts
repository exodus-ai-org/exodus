import type { McpServer } from '../db/schema'
import { decryptSecret, encryptSecret, isEncryptedSecret } from './crypto'
import { mcpPlaintext, type McpSecretsPlaintext } from './current'
import {
  restoreMcpSecrets,
  restoreSettingsSecrets,
  settingsPlaintext,
  stripMcpSecrets
} from './index'
import { restoreMcpLocators } from './locators'
import { looksLikeMask } from './mask'
import {
  MCP_KEY_NAMED_SECRET_COLUMNS,
  MCP_EXTRA_CONFIG_DESTINATION_KEY,
  MCP_SECRET_DESTINATIONS,
  MCP_SECRET_RECORD_COLUMNS,
  SECRET_DESTINATIONS,
  SETTINGS_SECRET_PATHS,
  type SettingsSecretPath,
  isSecretName
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
  url?: string | null
  args?: string[] | null
}

/**
 * How the whole-value locators are stored: `url` as `enc:v1:` of itself,
 * `args` as `enc:v1:` of its JSON (a jsonb string in the `args` column). Both
 * can carry secrets (a capability path, userinfo, `--api-key=…` — ruling (b)),
 * and masking them over the API (`locators.ts`) is not encryption at rest.
 */
function mapMcpLocators<T extends McpSecretColumns>(
  copy: T,
  fn: (s: string, label: string) => string | null,
  direction: 'seal' | 'open'
): void {
  if (typeof copy.url === 'string' && copy.url) {
    copy.url = fn(copy.url, 'url')
  }
  const args = copy.args as unknown
  if (direction === 'seal') {
    if (Array.isArray(args) && args.length > 0) {
      const sealed = fn(JSON.stringify(args), 'args')
      // Unchanged (no backend): keep the array as it was.
      copy.args = (
        sealed === null || !isEncryptedSecret(sealed) ? args : sealed
      ) as never
    }
    return
  }
  if (typeof args === 'string') {
    const opened = fn(args, 'args')
    let parsed: unknown = null
    try {
      parsed = opened === null ? null : JSON.parse(opened)
    } catch {
      parsed = null
    }
    copy.args = (Array.isArray(parsed) ? parsed : []) as never
  }
}

/**
 * One secret value through a seal / open step: a string, or a number under a
 * secret-named `extraConfig` key (sealed as a string envelope, opened back
 * into a number). `null` drops it.
 */
type SecretFn = (v: string | number, label: string) => string | number | null

/** Marks a sealed number, so opening it gives the number back. */
const NUMBER_ENVELOPE = 'exodus-number:'

/**
 * Every secret string inside `value` through `fn`: a string under a
 * secret-named key (`isSecretName`), at any depth beneath it — a
 * `tokens: { access }` object is a secret as a whole. A `null` answer drops
 * the key (or array item). `path` is the dotted route to each one.
 */
function mapKeyNamed(
  value: unknown,
  fn: SecretFn,
  path: string,
  secret = false
): unknown {
  if (secret && (typeof value === 'string' || typeof value === 'number')) {
    return fn(value, path)
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => {
      const mapped = mapKeyNamed(v, fn, `${path}.${i}`, secret)
      return mapped === null && v !== null ? [] : [mapped]
    })
  }
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    const mapped = mapKeyNamed(v, fn, `${path}.${k}`, secret || isSecretName(k))
    if (mapped !== null || v === null) out[k] = mapped
  }
  return out
}

/** Every MCP secret of a row (or write) through `fn`, as a copy. */
function mapMcpSecrets<T extends McpSecretColumns>(row: T, fn: SecretFn): T {
  const copy = { ...row }
  for (const col of MCP_SECRET_RECORD_COLUMNS) {
    const rec = copy[col]
    if (!isPlainObject(rec)) continue
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      const mapped = typeof v === 'string' ? fn(v, `${col}.${k}`) : v
      if (mapped !== null) out[k] = String(mapped)
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
  const open = (v: string, label: string): string | null => {
    const out = decryptSecret(v)
    if (out.ok) return out.value
    undecryptable.push(label)
    return null
  }
  const openAny: SecretFn = (v, label) => {
    if (typeof v === 'number') return v
    const out = open(v, label)
    return out !== null &&
      isEncryptedSecret(v) &&
      out.startsWith(NUMBER_ENVELOPE)
      ? Number(out.slice(NUMBER_ENVELOPE.length))
      : out
  }
  const plain = mapMcpSecrets(row, openAny)
  mapMcpLocators(plain, open, 'open')
  return { plain, undecryptable }
}

/** A write in its stored form, and how many values it encrypted. */
export function encryptMcpSecrets<T extends McpSecretColumns>(
  body: T
): { sealed: T; changed: number } {
  let changed = 0
  const seal = (v: string) => {
    const out = encryptSecret(v)
    if (out !== v) changed++
    return out
  }
  const sealAny: SecretFn = (v) => {
    if (typeof v === 'string') return seal(v)
    // A number: sealed as a string envelope when there is a backend; with
    // none it stays the number it was (plaintext, like every other value).
    const out = encryptSecret(`${NUMBER_ENVELOPE}${v}`)
    if (!isEncryptedSecret(out)) return v
    changed++
    return out
  }
  const sealed = mapMcpSecrets(body, sealAny)
  mapMcpLocators(sealed, seal, 'seal')
  return { sealed, changed }
}

interface McpDestination {
  url?: string | null
  transportType?: string | null
  command?: string | null
  args?: string[] | null
  extraConfig?: Record<string, unknown> | null
}

/**
 * The `extraConfig` values that name a place a secret goes (ruling a): every
 * string under a key matching `MCP_EXTRA_CONFIG_DESTINATION_KEY`, at any
 * depth, as `path=normalized value` — an OAuth `issuer` / `tokenUrl`, a proxy
 * `host`, an `endpoint`.
 */
function extraConfigDestinations(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => extraConfigDestinations(v, `${path}.${i}`))
  }
  if (!isPlainObject(value)) return []
  return Object.entries(value).flatMap(([k, v]) =>
    typeof v === 'string' && MCP_EXTRA_CONFIG_DESTINATION_KEY.test(k)
      ? [`${path}.${k}=${normalizeBaseUrl(v) ?? ''}`]
      : extraConfigDestinations(v, `${path}.${k}`)
  )
}

type McpWriteBody = McpSecretColumns & {
  url?: string | null
  transportType?: string | null
  command?: string | null
  args?: string[] | null
}

const sameArgs = (
  a: string[] | null | undefined,
  b: string[] | null | undefined
) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

/**
 * Which secret columns a write moves to a new destination. The destination is
 * the EFFECTIVE one — each of `url` / `transportType` / `command` / `args` as
 * posted, or as stored when the write leaves it out (a partial PUT) —
 * compared with the stored one: `headers` and the `extraConfig` secrets go to
 * the `url` over `transportType` (and to the `extraConfig` url / endpoint /
 * host / issuer values — ruling a); `env` goes to the process `command` +
 * `args` start. `body` must already have had its masked `url` / `args` restored
 * (`restoreMcpLocators`), so a url posted back as its mask is no move.
 */
export function movedMcpSecretColumns(
  body: McpDestination,
  stored: McpDestination
): Set<keyof McpSecretsPlaintext> {
  const pick = <K extends keyof McpDestination>(k: K) =>
    body[k] === undefined ? stored[k] : body[k]
  const moved = new Set<keyof McpSecretsPlaintext>()
  // A destination under a secret-named key (`tokenUrl`) comes back masked:
  // compare what the posted masks stand for, not the masks.
  const postedExtra =
    body.extraConfig === undefined
      ? stored.extraConfig
      : restoreMcpSecrets(
          { extraConfig: body.extraConfig },
          {
            env: null,
            headers: null,
            extraConfig: stored.extraConfig ?? null
          }
        ).extraConfig
  const remoteMoved =
    normalizeBaseUrl(pick('url')) !== normalizeBaseUrl(stored.url) ||
    (pick('transportType') ?? 'stdio') !== (stored.transportType ?? 'stdio') ||
    extraConfigDestinations(postedExtra).toSorted().join('\n') !==
      extraConfigDestinations(stored.extraConfig).toSorted().join('\n')
  const processMoved =
    (pick('command') ?? '').trim() !== (stored.command ?? '').trim() ||
    !sameArgs(pick('args'), stored.args)
  for (const [col, dest] of Object.entries(MCP_SECRET_DESTINATIONS) as [
    keyof McpSecretsPlaintext,
    'url' | 'command'
  ][]) {
    if (dest === 'url' ? remoteMoved : processMoved) moved.add(col)
  }
  return moved
}

/**
 * The stored secrets a posted mask may stand for (`restoreMcpSecrets`), minus
 * those whose destination the same write moves (ruling R1, MCP form).
 */
export function mcpPlaintextForWrite(
  body: McpWriteBody,
  stored:
    | (Pick<McpServer, 'env' | 'headers' | 'extraConfig'> & McpDestination)
    | null
    | undefined
): McpSecretsPlaintext {
  const current = mcpPlaintext(stored)
  if (!stored) return current
  for (const col of movedMcpSecretColumns(body, stored)) current[col] = null
  return current
}

/**
 * An MCP update as it is written (before encryption):
 *
 * 1. A `url` / `args` posted back as the stored one's mask is the stored one.
 * 2. Every other posted mask becomes the stored secret — unless the write
 *    moves that secret's destination (`movedMcpSecretColumns`), in which case
 *    only plaintext posted in this same request survives.
 * 3. A moved secret column the write left out is written too, with the
 *    secrets stripped: a partial PUT of just `url` or `args` cannot carry the
 *    stored `Authorization` / `GITHUB_TOKEN` to the new destination (S2
 *    review C1).
 */
export function prepareMcpUpdate<T extends McpWriteBody>(
  body: T,
  stored:
    | (Pick<McpServer, 'env' | 'headers' | 'extraConfig'> & McpDestination)
    | null
    | undefined
): T {
  // N1: args are handed to the command. A new command gets none of the
  // stored args: masked ones are refused, and left-out ones are not carried
  // over at all — stripping them by shape could miss a secret the masker does
  // not recognise (a JSON argument). The desktop form always posts args with
  // the command, so only a command-only PUT starts with an empty list.
  const commandMoved =
    !!stored &&
    body.command !== undefined &&
    (body.command ?? '').trim() !== (stored.command ?? '').trim()
  const located = restoreMcpLocators(body, stored, {
    restoreArgs: !commandMoved
  })
  if (commandMoved && located.args === undefined) located.args = []
  const restored = restoreMcpSecrets(
    located,
    mcpPlaintextForWrite(located, stored)
  )
  if (!stored) return restored
  for (const col of movedMcpSecretColumns(located, stored)) {
    if (restored[col] !== undefined) continue
    ;(restored as Record<string, unknown>)[col] = stripMcpSecrets(
      col,
      stored[col]
    )
  }
  return restored
}
