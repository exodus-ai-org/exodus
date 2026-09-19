import { X509Certificate } from 'crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createSecureContext } from 'tls'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const tlsDir = mkdtempSync(join(tmpdir(), 'exodus-tls-'))
let encryptionAvailable = true

// safeStorage stand-in: reversible, and visibly not the plaintext.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (s: string) =>
      Buffer.from(`enc:${Buffer.from(s).toString('hex')}`),
    decryptString: (b: Buffer) =>
      Buffer.from(b.toString('utf8').slice(4), 'hex').toString('utf8')
  }
}))
vi.mock('@main/lib/paths', () => ({ getTlsDir: () => tlsDir }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { fingerprintOf, loadOrCreateCertificate, resetCertificate } =
  await import('@main/lib/lan/certificate')

beforeEach(() => {
  encryptionAvailable = true
  for (const name of readdirSync(tlsDir)) rmSync(join(tlsDir, name))
})

afterAll(() => rmSync(tlsDir, { recursive: true, force: true }))

describe('LAN certificate', () => {
  it('creates a certificate Node accepts, valid for about ten years', async () => {
    const { certPem } = await loadOrCreateCertificate()
    const parsed = new X509Certificate(certPem)

    expect(parsed.subject).toContain('CN=Exodus')
    const years = (Date.parse(parsed.validTo) - Date.now()) / (365 * 864e5)
    expect(years).toBeGreaterThan(9.9)
    expect(years).toBeLessThan(10.1)
  })

  it('can serve TLS: the key matches the certificate', async () => {
    const { certPem, keyPem } = await loadOrCreateCertificate()

    expect(() =>
      createSecureContext({ cert: certPem, key: keyPem })
    ).not.toThrow()
    expect(
      new X509Certificate(certPem).checkPrivateKey(
        (await import('crypto')).createPrivateKey(keyPem)
      )
    ).toBe(true)
  })

  it('keeps the same fingerprint across loads — devices pin it', async () => {
    const first = await loadOrCreateCertificate()
    const second = await loadOrCreateCertificate()

    expect(second.fingerprint).toBe(first.fingerprint)
    expect(second.keyPem).toBe(first.keyPem)
    expect(first.fingerprint).toBe(fingerprintOf(first.certPem))
    // base64url of 32 bytes, unpadded
    expect(first.fingerprint).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('never writes the private key in the clear when safeStorage works', async () => {
    const { keyPem } = await loadOrCreateCertificate()
    const secretLine = keyPem.split('\n')[1]

    for (const name of readdirSync(tlsDir)) {
      expect(readFileSync(join(tlsDir, name), 'utf8')).not.toContain(secretLine)
    }
  })

  it('still works, unencrypted, where safeStorage is unavailable', async () => {
    encryptionAvailable = false
    const created = await loadOrCreateCertificate()
    const loaded = await loadOrCreateCertificate()

    expect(loaded.keyPem).toBe(created.keyPem)
    expect(loaded.fingerprint).toBe(created.fingerprint)
  })

  it('reset issues a different certificate, and that one sticks', async () => {
    const before = await loadOrCreateCertificate()
    const after = await resetCertificate()

    expect(after.fingerprint).not.toBe(before.fingerprint)
    expect((await loadOrCreateCertificate()).fingerprint).toBe(
      after.fingerprint
    )
  })
})
