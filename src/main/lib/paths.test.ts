import { join } from 'path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' }
}))

describe('paths', () => {
  let paths: typeof import('./paths')

  beforeEach(async () => {
    vi.resetModules()
    paths = await import('./paths')
  })

  it('getExodusHome returns ~/.exodus', () => {
    const home = paths.getExodusHome()
    expect(home).toBe(join(paths.getHomedir(), '.exodus'))
  })

  it('getDatabaseDir returns ~/.exodus/database', () => {
    expect(paths.getDatabaseDir()).toBe(
      join(paths.getHomedir(), '.exodus', 'database')
    )
  })

  it('getLogsDir returns ~/.exodus/logs', () => {
    expect(paths.getLogsDir()).toBe(join(paths.getHomedir(), '.exodus', 'logs'))
  })

  it('getSkillsDir returns ~/.exodus/skills', () => {
    expect(paths.getSkillsDir()).toBe(
      join(paths.getHomedir(), '.exodus', 'skills')
    )
  })

  it('getAutoBackupsDir returns ~/.exodus/backups/auto', () => {
    expect(paths.getAutoBackupsDir()).toBe(
      join(paths.getHomedir(), '.exodus', 'backups', 'auto')
    )
  })

  it('getManualBackupsDir returns ~/.exodus/backups/manual', () => {
    expect(paths.getManualBackupsDir()).toBe(
      join(paths.getHomedir(), '.exodus', 'backups', 'manual')
    )
  })
})
