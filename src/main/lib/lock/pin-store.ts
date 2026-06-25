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

function readRecord(): PinRecord | null {
  const path = getLockSecretPath()
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path)
    let json: string
    if (safeStorage.isEncryptionAvailable()) {
      // Fallback for records written in "degraded mode" (no safeStorage at
      // write time). Filesystem tampering is out of scope per the lock's
      // threat model (filesystem access already bypasses the lock), so reading
      // a plaintext record here is acceptable, not a downgrade.
      try {
        json = safeStorage.decryptString(raw)
      } catch {
        json = raw.toString('utf8')
      }
    } else {
      json = raw.toString('utf8')
    }
    return JSON.parse(json) as PinRecord
  } catch (err) {
    logger.error('app', 'Failed to read lock secret', { error: String(err) })
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
