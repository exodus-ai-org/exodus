import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

import { app } from 'electron'

/**
 * `~/.exodus` — packaged and unpackaged (dev) builds alike, so a dev build
 * sees the same chats, settings and memories as the real app. Exodus is the
 * successor of `universal-client`, which uses this same directory.
 *
 * PGlite is single-process: never run two Exodus processes (a dev build, the
 * packaged app, universal-client) against one data directory at the same
 * time — the database can be corrupted. Backups live in `~/.exodus/backups`.
 *
 * `EXODUS_HOME` points a run at another directory instead (e.g. a scratch
 * dir); the e2e suite gets the same effect by sandboxing `$HOME`.
 */
export function getExodusHome(): string {
  return process.env.EXODUS_HOME || join(homedir(), '.exodus')
}

export function getDatabaseDir(): string {
  return join(getExodusHome(), 'database')
}

export function getLogsDir(): string {
  const dir = join(getExodusHome(), 'logs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getArtifactsDir(): string {
  return join(getExodusHome(), 'artifacts')
}

/** Installed Agent Skills — one directory per slug plus `.lock.json`. The same
 *  directory `exodus-cli` installs into, so the two stay interchangeable. */
export function getSkillsDir(): string {
  return join(getExodusHome(), 'skills')
}

/** Philharmonic Group workspace root, one directory per conversation. */
export function getGroupsDir(): string {
  return join(getExodusHome(), 'groups')
}

export function getGroupDir(conversationId: string): string {
  const dir = join(getGroupsDir(), conversationId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** DuckDB chat-audit snapshot (`exodus.duckdb` + `snapshot.json`) — Settings → Developer. */
export function getAnalyticsDir(): string {
  const dir = join(getExodusHome(), 'analytics')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getAnalyticsDbPath(): string {
  return join(getAnalyticsDir(), 'exodus.duckdb')
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

export function getLockSecretPath(): string {
  return join(getExodusHome(), 'lock.dat')
}

export function getLockConfigPath(): string {
  return join(getExodusHome(), 'lock-config.json')
}

export function ensureExodusDirs(): void {
  const dirs = [
    getExodusHome(),
    getDatabaseDir(),
    getLogsDir(),
    getArtifactsDir(),
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

/**
 * Resolves a path under the app's bundled `resources/` directory (icons,
 * etc.). electron-forge's Vite plugin has no electron-vite `?asset` import,
 * so bundled assets are read straight off disk instead.
 *
 * In dev, `__dirname` is `<repo>/.vite/build` (where main.js lives) — two
 * levels up is the repo root, then into `resources/`.
 *
 * In a packaged build, `packagerConfig.extraResource: ['./resources']`
 * (see forge.config.ts) copies the *directory* into
 * `Contents/Resources/resources/` — electron-packager preserves the source
 * folder's basename rather than flattening its contents — so
 * `process.resourcesPath` alone is one level short; verified against a real
 * `electron-forge package` output, not assumed.
 */
export function getResourcePath(relPath: string): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(__dirname, '../../resources')
  return join(base, relPath)
}
