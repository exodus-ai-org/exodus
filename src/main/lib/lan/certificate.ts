import { createHash, webcrypto, X509Certificate } from 'crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

import { safeStorage } from 'electron'

import { logger } from '../logger'
import { getTlsDir } from '../paths'

export interface LanCertificate {
  certPem: string
  keyPem: string
  /** What a paired device pins: base64url SHA-256 of the certificate's DER. */
  fingerprint: string
}

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000
const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }

const certPath = () => join(getTlsDir(), 'cert.pem')
const keyPath = () => join(getTlsDir(), 'key.enc')

export function fingerprintOf(certPem: string): string {
  return createHash('sha256')
    .update(new X509Certificate(certPem).raw)
    .digest('base64url')
}

function toPem(label: string, der: ArrayBuffer): string {
  const body = Buffer.from(der)
    .toString('base64')
    .match(/.{1,64}/g)!
    .join('\n')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}

function writeKey(keyPem: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(keyPath(), safeStorage.encryptString(keyPem), { mode: 0o600 })
    return
  }
  // The same degraded mode as the lock's pin-store: no OS keychain to lean on.
  logger.warn(
    'lan',
    'safeStorage unavailable — storing the TLS key unencrypted'
  )
  writeFileSync(keyPath(), keyPem, { mode: 0o600 })
}

function readKey(): string {
  const raw = readFileSync(keyPath())
  const text = raw.toString('utf8')
  return text.startsWith('-----BEGIN') ? text : safeStorage.decryptString(raw)
}

async function create(): Promise<LanCertificate> {
  // Lazy: needed once per installation, and @peculiar/x509 will not even
  // import without the reflect polyfill (tsyringe) loaded first.
  await import('reflect-metadata')
  const x509 = await import('@peculiar/x509')
  x509.cryptoProvider.set(webcrypto as Crypto)

  const keys = await webcrypto.subtle.generateKey(ALGORITHM, true, [
    'sign',
    'verify'
  ])
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: Date.now().toString(16),
    name: 'CN=Exodus',
    keys,
    signingAlgorithm: ALGORITHM,
    notBefore: new Date(),
    notAfter: new Date(Date.now() + TEN_YEARS_MS)
  })
  const certPem = cert.toString('pem')
  const keyPem = toPem(
    'PRIVATE KEY',
    await webcrypto.subtle.exportKey('pkcs8', keys.privateKey)
  )

  mkdirSync(getTlsDir(), { recursive: true })
  writeFileSync(certPath(), certPem)
  writeKey(keyPem)
  return { certPem, keyPem, fingerprint: fingerprintOf(certPem) }
}

/**
 * The certificate is the trust anchor of every pairing: a device pins its
 * fingerprint and checks nothing else — no CA (it is self-signed), no host name
 * (the computer is reached by IP, `.local` or tailnet name alike). So it is
 * created once and from then on only ever loaded; replacing it silently would
 * lock every paired device out.
 */
export async function loadOrCreateCertificate(): Promise<LanCertificate> {
  if (existsSync(certPath()) && existsSync(keyPath())) {
    const certPem = readFileSync(certPath(), 'utf8')
    return { certPem, keyPem: readKey(), fingerprint: fingerprintOf(certPem) }
  }
  return create()
}

/** "Reset all": every existing pairing is void afterwards, by design. */
export async function resetCertificate(): Promise<LanCertificate> {
  rmSync(certPath(), { force: true })
  rmSync(keyPath(), { force: true })
  return create()
}
