import { safeStorage } from 'electron'

/**
 * One secret value at rest (spec 2026-09-25 §2.3): `enc:v1:` + the base64 of
 * `safeStorage.encryptString` — the macOS Keychain, Windows DPAPI or Linux
 * libsecret key, the same one `lock/pin-store.ts` and `lan/certificate.ts`
 * seal with. The prefix makes "needs decrypting" unambiguous (no provider key
 * starts with it) and gives a later format a version to bump.
 *
 * - No usable backend (`isEncryptionAvailable()` false, or Linux's
 *   `basic_text` — a fixed key, no protection): values stay plaintext, one
 *   warning is logged and `encryptionState()` says `'unavailable'` for the
 *   Settings notice. Never blocks the app.
 * - A ciphertext that will not open (another machine, a changed code-signing
 *   identity, a backup restored from elsewhere): `{ ok: false }` — the caller
 *   treats the field as unset and lists it for re-entry. The ciphertext itself
 *   is never handed out as if it were the key.
 */

export const ENC_PREFIX = 'enc:v1:'

export type EncryptionState = 'on' | 'unavailable'

export function isEncryptedSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

export function encryptionState(): EncryptionState {
  try {
    // `safeStorage` is absent where Electron is mocked away, and on macOS it
    // is only usable after `ready` — both read as unavailable.
    if (!safeStorage?.isEncryptionAvailable?.()) return 'unavailable'
    if (
      process.platform === 'linux' &&
      safeStorage.getSelectedStorageBackend?.() === 'basic_text'
    ) {
      return 'unavailable'
    }
    return 'on'
  } catch {
    return 'unavailable'
  }
}

let warned = false

/** For tests: the "unavailable" warning is once per process. */
export function resetEncryptionWarning(): void {
  warned = false
}

export function warnUnavailableOnce(): void {
  if (warned) return
  warned = true
  // Imported lazily: the logger needs Electron's `app` at import, and this
  // module is reached from the DB queries, which must stay importable without.
  void import('../logger').then(({ logger }) =>
    logger.warn(
      'secrets',
      'safeStorage is unavailable — secrets are stored unencrypted'
    )
  )
}

/**
 * The stored form of a secret. Empty and already-encrypted values are
 * returned as they are; so is everything when there is no backend.
 */
export function encryptSecret(value: string): string {
  if (!value || isEncryptedSecret(value)) return value
  if (encryptionState() !== 'on') {
    warnUnavailableOnce()
    return value
  }
  return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
}

export type DecryptedSecret = { ok: true; value: string } | { ok: false }

/**
 * The plaintext of a stored secret. A value without the prefix is plaintext
 * already (written before the migration, or with no backend).
 */
export function decryptSecret(value: string): DecryptedSecret {
  if (!isEncryptedSecret(value)) return { ok: true, value }
  try {
    const body = value.slice(ENC_PREFIX.length)
    if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(body)) return { ok: false }
    return {
      ok: true,
      value: safeStorage.decryptString(Buffer.from(body, 'base64'))
    }
  } catch {
    // Not logged with the error: nothing about the value belongs in a log.
    return { ok: false }
  }
}
