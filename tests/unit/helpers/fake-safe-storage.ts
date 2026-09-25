/**
 * A stand-in for Electron's `safeStorage`: tests must never reach a real
 * keychain. The "ciphertext" is the OSCrypt-style `v10` tag, the machine it
 * was sealed on, and the plaintext XOR-ed so it never appears verbatim in a
 * row. Switching `state.machine` makes every earlier ciphertext undecryptable
 * — what a changed code-signing identity or another computer looks like.
 *
 * Use from a mock factory, so the test and the module under test share it:
 *   vi.mock('electron', async () => {
 *     const { fakeSafeStorage } = await import('../../../helpers/fake-safe-storage')
 *     return { app: { getPath: () => '/tmp' }, safeStorage: fakeSafeStorage }
 *   })
 */
export const fakeSafeStorageState = {
  available: true,
  machine: 'machine-A',
  backend: 'keychain' as string,
  // Available, but the Keychain refuses this call (a denied prompt).
  denyEncrypt: false,
  // Available, but decrypting fails this once (a transient keychain error).
  denyDecrypt: false,
  // OSCrypt's version tag; a future Electron could change it.
  tag: 'v10',
  // Older tags it still opens (a new Electron reading its old blobs).
  alsoOpens: [] as string[]
}

const tag = () =>
  Buffer.from(`${fakeSafeStorageState.tag}${fakeSafeStorageState.machine}|`)
const xor = (b: Buffer) => Buffer.from(b.map((x) => x ^ 0x5a))

export const fakeSafeStorage = {
  isEncryptionAvailable: () => fakeSafeStorageState.available,
  getSelectedStorageBackend: () => fakeSafeStorageState.backend,
  encryptString(plain: string): Buffer {
    if (!fakeSafeStorageState.available || fakeSafeStorageState.denyEncrypt) {
      throw new Error('Encryption is not available.')
    }
    return Buffer.concat([tag(), xor(Buffer.from(plain, 'utf8'))])
  },
  decryptString(sealed: Buffer): string {
    const t = [fakeSafeStorageState.tag, ...fakeSafeStorageState.alsoOpens]
      .map((v) => Buffer.from(`${v}${fakeSafeStorageState.machine}|`))
      .find((c) => sealed.subarray(0, c.length).equals(c))
    if (
      !fakeSafeStorageState.available ||
      fakeSafeStorageState.denyDecrypt ||
      !t
    ) {
      throw new Error(
        'Error while decrypting the ciphertext provided to safeStorage.decryptString.'
      )
    }
    return xor(sealed.subarray(t.length)).toString('utf8')
  }
}

export function resetFakeSafeStorage(): void {
  fakeSafeStorageState.available = true
  fakeSafeStorageState.machine = 'machine-A'
  fakeSafeStorageState.backend = 'keychain'
  fakeSafeStorageState.denyEncrypt = false
  fakeSafeStorageState.denyDecrypt = false
  fakeSafeStorageState.tag = 'v10'
  fakeSafeStorageState.alsoOpens = []
}
