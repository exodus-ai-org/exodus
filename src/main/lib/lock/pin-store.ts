import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname } from 'path'

import { safeStorage } from 'electron'

import { logger } from '../logger'
import { getLockSecretPath } from '../paths'

interface PinRecord {
  version: 1
  salt: string // hex
  hash: string // hex
  encrypted: boolean
}

const SCRYPT_KEYLEN = 32

function derive(pin: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex')
  return scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex')
}

/**
 * safeStorage-encrypted blobs carry Chromium's OSCrypt tag as their first
 * bytes: "v10" (basic/DPAPI/keychain) or "v11" (libsecret). A degraded-mode
 * plaintext record is JSON and always starts with "{", so the tag is an
 * unambiguous "this needs decrypting" marker.
 */
function looksEncrypted(raw: Buffer): boolean {
  return (
    raw.length >= 3 &&
    raw[0] === 0x76 && // v
    raw[1] === 0x31 && // 1
    (raw[2] === 0x30 || raw[2] === 0x31) // 0 | 1
  )
}

function isValidRecord(value: unknown): value is PinRecord {
  const r = value as Partial<PinRecord> | null
  return (
    !!r &&
    r.version === 1 &&
    typeof r.salt === 'string' &&
    typeof r.hash === 'string'
  )
}

function readRecord(): PinRecord | null {
  const path = getLockSecretPath()
  if (!existsSync(path)) return null

  const raw = readFileSync(path)
  let json: string

  if (looksEncrypted(raw)) {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn(
        'app',
        'Lock secret is encrypted but OS encryption is unavailable — treating the app as unlocked. Re-set your PIN in Settings.'
      )
      return null
    }
    try {
      json = safeStorage.decryptString(raw)
    } catch (err) {
      // Typically means the file was encrypted by a different OS keychain /
      // machine / app build, or the keychain entry was removed. It can't be
      // recovered; per the lock's threat model (filesystem access already
      // bypasses the lock) fail open rather than lock the user out forever.
      logger.warn(
        'app',
        'Could not decrypt lock secret — treating the app as unlocked. Re-set your PIN in Settings.',
        { error: String(err) }
      )
      return null
    }
  } else {
    // Degraded-mode plaintext record (written when safeStorage was unavailable).
    json = raw.toString('utf8')
  }

  try {
    const parsed: unknown = JSON.parse(json)
    if (isValidRecord(parsed)) return parsed
    logger.warn('app', 'Lock secret has an unexpected shape — ignoring it.')
    return null
  } catch (err) {
    logger.warn('app', 'Lock secret is not valid JSON — ignoring it.', {
      error: String(err)
    })
    return null
  }
}

function writeRecord(record: PinRecord): void {
  const path = getLockSecretPath()
  mkdirSync(dirname(path), { recursive: true })
  const json = JSON.stringify(record)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(path, safeStorage.encryptString(json))
  } else {
    logger.warn(
      'app',
      'safeStorage unavailable — storing lock record unencrypted'
    )
    writeFileSync(path, json, 'utf8')
  }
}

export function hasPin(): boolean {
  return readRecord() !== null
}

export function setPin(pin: string): void {
  const saltHex = randomBytes(16).toString('hex')
  writeRecord({
    version: 1,
    salt: saltHex,
    hash: derive(pin, saltHex),
    encrypted: safeStorage.isEncryptionAvailable()
  })
}

export function verify(pin: string): boolean {
  const record = readRecord()
  if (!record) return false
  const candidate = Buffer.from(derive(pin, record.salt), 'hex')
  const expected = Buffer.from(record.hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export function clear(): void {
  const path = getLockSecretPath()
  if (existsSync(path)) rmSync(path)
}
