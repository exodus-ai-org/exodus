import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// `os.homedir()` reads $HOME on POSIX at call time, so pointing it at a temp
// dir keeps every directory these tests create out of the real home.
const home = mkdtempSync(join(tmpdir(), 'exodus-paths-'))
const legacyUserData = join(home, 'legacy-user-data')
const originalHome = process.env.HOME
process.env.HOME = home
// vitest.config.ts sets EXODUS_HOME for every test (so none can reach the real
// data dir); this file exercises the default resolution, so lift it here.
const originalExodusHome = process.env.EXODUS_HOME
delete process.env.EXODUS_HOME

const electronApp = vi.hoisted(() => ({
  isPackaged: true,
  userData: '',
  getPath() {
    return this.userData
  }
}))
vi.mock('electron', () => ({ app: electronApp }))
electronApp.userData = legacyUserData

afterAll(() => {
  process.env.HOME = originalHome
  if (originalExodusHome === undefined) delete process.env.EXODUS_HOME
  else process.env.EXODUS_HOME = originalExodusHome
})

describe('paths', () => {
  let paths: typeof import('@main/lib/paths')

  beforeEach(async () => {
    electronApp.isPackaged = true
    vi.resetModules()
    paths = await import('@main/lib/paths')
  })

  it('getExodusHome is ~/.exodus when packaged', () => {
    expect(paths.getExodusHome()).toBe(join(home, '.exodus'))
  })

  it('getExodusHome is the same ~/.exodus when unpackaged — dev sees the real data', () => {
    electronApp.isPackaged = false
    expect(paths.getExodusHome()).toBe(join(home, '.exodus'))
  })

  it('EXODUS_HOME overrides the data dir, packaged or not', () => {
    process.env.EXODUS_HOME = join(home, 'custom')
    try {
      electronApp.isPackaged = false
      expect(paths.getExodusHome()).toBe(join(home, 'custom'))
      expect(paths.getDatabaseDir()).toBe(join(home, 'custom', 'database'))
      electronApp.isPackaged = true
      expect(paths.getExodusHome()).toBe(join(home, 'custom'))
    } finally {
      delete process.env.EXODUS_HOME
    }
  })

  it('derives every data dir from the home', () => {
    electronApp.isPackaged = false
    const root = join(home, '.exodus')
    expect(paths.getDatabaseDir()).toBe(join(root, 'database'))
    expect(paths.getLogsDir()).toBe(join(root, 'logs'))
    expect(paths.getArtifactsDir()).toBe(join(root, 'artifacts'))
    expect(paths.getAutoBackupsDir()).toBe(join(root, 'backups', 'auto'))
    expect(paths.getManualBackupsDir()).toBe(join(root, 'backups', 'manual'))
    expect(paths.getGroupDir('c1')).toBe(join(root, 'groups', 'c1'))
    expect(existsSync(join(root, 'groups', 'c1'))).toBe(true)
  })

  it('ensureExodusDirs creates the directory tree', () => {
    paths.ensureExodusDirs()
    for (const sub of ['database', 'logs', 'artifacts', 'backups/auto']) {
      expect(existsSync(join(home, '.exodus', sub))).toBe(true)
    }
  })

  it('migrateFromLegacyLocation moves legacy data into ~/.exodus', () => {
    mkdirSync(join(legacyUserData, 'database'), { recursive: true })
    writeFileSync(join(legacyUserData, 'database', 'PG_VERSION'), '17')

    paths.migrateFromLegacyLocation()

    expect(
      readFileSync(join(home, '.exodus', 'database', 'PG_VERSION'), 'utf8')
    ).toBe('17')
    expect(existsSync(join(legacyUserData, 'database'))).toBe(false)
  })
})
