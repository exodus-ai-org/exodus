import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

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
