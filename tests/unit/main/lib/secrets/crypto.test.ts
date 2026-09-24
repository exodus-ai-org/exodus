// safeStorage encryption of one secret value (spec 2026-09-25 §2.3): the
// `enc:v1:` envelope, the unavailable backend (plaintext + a status) and a
// decrypt failure (never the ciphertext as a key). safeStorage is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fakeSafeStorageState,
  resetFakeSafeStorage
} from '../../../helpers/fake-safe-storage'

const warn = vi.hoisted(() => vi.fn())
vi.mock('electron', async () => {
  const { fakeSafeStorage } = await import('../../../helpers/fake-safe-storage')
  return { app: { getPath: () => '/tmp' }, safeStorage: fakeSafeStorage }
})
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() }
}))

const {
  ENC_PREFIX,
  decryptSecret,
  encryptSecret,
  encryptionState,
  isEncryptedSecret,
  resetEncryptionWarning
} = await import('@main/lib/secrets/crypto')

const KEY = 'sk-proj-abcdefghijklmnop-1234'
const realPlatform = process.platform

beforeEach(() => {
  resetFakeSafeStorage()
  resetEncryptionWarning()
  warn.mockClear()
})
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: realPlatform })
})

describe('encryptSecret / decryptSecret', () => {
  it('round-trips through an enc:v1: envelope that hides the value', () => {
    const sealed = encryptSecret(KEY)
    expect(sealed.startsWith(ENC_PREFIX)).toBe(true)
    expect(sealed).not.toContain(KEY)
    expect(sealed).not.toContain(KEY.slice(-4))
    expect(isEncryptedSecret(sealed)).toBe(true)
    expect(decryptSecret(sealed)).toEqual({ ok: true, value: KEY })
  })

  it('leaves an already-encrypted value alone', () => {
    const sealed = encryptSecret(KEY)
    expect(encryptSecret(sealed)).toBe(sealed)
  })

  it('leaves an empty value alone', () => {
    expect(encryptSecret('')).toBe('')
  })

  it('reads a plaintext value (not yet migrated) as itself', () => {
    expect(decryptSecret(KEY)).toEqual({ ok: true, value: KEY })
    expect(isEncryptedSecret(KEY)).toBe(false)
  })

  it('reports a ciphertext it cannot open as a failure, never as a value', () => {
    const sealed = encryptSecret(KEY)
    fakeSafeStorageState.machine = 'machine-B'
    const out = decryptSecret(sealed)
    expect(out).toEqual({ ok: false })
    expect(JSON.stringify(out)).not.toContain(ENC_PREFIX)
  })

  it('reports a malformed envelope as a failure', () => {
    expect(decryptSecret(`${ENC_PREFIX}!!!not base64`)).toEqual({ ok: false })
  })
})

describe('an unavailable backend', () => {
  it('keeps plaintext, says so, and warns once', async () => {
    fakeSafeStorageState.available = false
    expect(encryptSecret(KEY)).toBe(KEY)
    expect(encryptSecret(KEY)).toBe(KEY)
    expect(encryptionState()).toBe('unavailable')
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(warn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(warn.mock.calls)).not.toContain(KEY)
  })

  it("treats Linux's basic_text backend as unavailable", () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    fakeSafeStorageState.backend = 'basic_text'
    expect(encryptSecret(KEY)).toBe(KEY)
    expect(encryptionState()).toBe('unavailable')
  })

  it('is on with a real backend', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    fakeSafeStorageState.backend = 'gnome_libsecret'
    expect(encryptionState()).toBe('on')
    expect(encryptSecret(KEY).startsWith(ENC_PREFIX)).toBe(true)
  })

  it('cannot open a ciphertext either', () => {
    const sealed = encryptSecret(KEY)
    fakeSafeStorageState.available = false
    expect(decryptSecret(sealed)).toEqual({ ok: false })
  })
})
