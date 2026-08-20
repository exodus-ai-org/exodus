import { tmpdir } from 'os'
import { join } from 'path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/db', () => ({
  pglite: {
    dumpDataDir: vi.fn().mockResolvedValue(new Blob(['fake-data']))
  }
}))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/queries', () => ({
  updateSettingField: vi.fn(),
  getSettings: vi.fn().mockResolvedValue({ autoBackup: true })
}))
vi.mock('@main/lib/paths', () => ({
  getAutoBackupsDir: () => join(tmpdir(), 'exodus-test-backups'),
  getLogsDir: () => join(tmpdir(), 'exodus-test-logs')
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('backup', () => {
  it('generateBackupFileName returns YYYY-MM-DD format', async () => {
    const { generateBackupFileName } = await import('@main/lib/backup')
    const name = generateBackupFileName()
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}\.tar\.gz$/)
  })
})
