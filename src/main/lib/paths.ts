import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

import { app } from 'electron'

export const getHomedir = homedir

export function getExodusHome(): string {
  return join(getHomedir(), '.exodus')
}

export function getDatabaseDir(): string {
  return join(getExodusHome(), 'database')
}

export function getLogsDir(): string {
  const dir = join(getExodusHome(), 'logs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getSkillsDir(): string {
  return join(getExodusHome(), 'skills')
}

export function getBackupsDir(): string {
  return join(getExodusHome(), 'backups')
}

export function getAutoBackupsDir(): string {
  const dir = join(getBackupsDir(), 'auto')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getManualBackupsDir(): string {
  const dir = join(getBackupsDir(), 'manual')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function ensureExodusDirs(): void {
  const dirs = [
    getExodusHome(),
    getDatabaseDir(),
    getLogsDir(),
    getSkillsDir(),
    getAutoBackupsDir(),
    getManualBackupsDir()
  ]
  for (const dir of dirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

/**
 * One-time migration: move database/, logs/, skills/ from
 * ~/Library/Application Support/Exodus/ to ~/.exodus/
 *
 * Only runs if data exists at old location but not at new location.
 * Uses renameSync for atomic same-disk move.
 */
export function migrateFromLegacyLocation(): void {
  const legacyBase = app.getPath('userData')
  const subdirs = ['database', 'logs', 'skills']

  ensureExodusDirs()

  for (const sub of subdirs) {
    const oldPath = join(legacyBase, sub)
    const newPath = join(getExodusHome(), sub)

    if (existsSync(oldPath)) {
      const newIsEmpty =
        existsSync(newPath) && readdirSync(newPath).length === 0

      if (!existsSync(newPath) || newIsEmpty) {
        if (newIsEmpty) rmdirSync(newPath)
        renameSync(oldPath, newPath)
      }
    }
  }
}
