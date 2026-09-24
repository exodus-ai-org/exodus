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
  backend: 'keychain' as string
}

const tag = () => Buffer.from(`v10${fakeSafeStorageState.machine}|`)
const xor = (b: Buffer) => Buffer.from(b.map((x) => x ^ 0x5a))

export const fakeSafeStorage = {
  isEncryptionAvailable: () => fakeSafeStorageState.available,
  getSelectedStorageBackend: () => fakeSafeStorageState.backend,
  encryptString(plain: string): Buffer {
    if (!fakeSafeStorageState.available) {
      throw new Error('Encryption is not available.')
    }
    return Buffer.concat([tag(), xor(Buffer.from(plain, 'utf8'))])
  },
  decryptString(sealed: Buffer): string {
    const t = tag()
    if (
      !fakeSafeStorageState.available ||
      !sealed.subarray(0, t.length).equals(t)
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
}
