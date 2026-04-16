import { existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'

import cron, { type ScheduledTask } from 'node-cron'

import { pglite } from './db/db'
import { getSettings, updateSettingField } from './db/queries'
import { logger } from './logger'
import { getAutoBackupsDir } from './paths'

const MAX_AUTO_BACKUPS = 7
let scheduledBackup: ScheduledTask | null = null

export function generateBackupFileName(): string {
  return new Date().toISOString().slice(0, 10) + '.tar.gz'
}

export async function createAutoBackup(): Promise<string> {
  const dir = getAutoBackupsDir()
  const fileName = generateBackupFileName()
  const filePath = join(dir, fileName)

  logger.info('app', 'Creating auto backup', { filePath })

  const blob = await pglite.dumpDataDir('gzip')
  const buffer = Buffer.from(await blob.arrayBuffer())
  await writeFile(filePath, buffer)

  await updateSettingField('lastBackupAt', new Date())

  cleanupOldBackups()

  logger.info('app', 'Auto backup completed', { filePath, size: buffer.length })
  return filePath
}

function cleanupOldBackups(): void {
  const dir = getAutoBackupsDir()
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.tar.gz'))
    .map((f) => ({ name: f, time: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time)

  for (const file of files.slice(MAX_AUTO_BACKUPS)) {
    unlinkSync(join(dir, file.name))
    logger.info('app', 'Deleted old backup', { file: file.name })
  }
}

export interface BackupInfo {
  name: string
  size: number
  createdAt: string
}

export function listAutoBackups(): BackupInfo[] {
  const dir = getAutoBackupsDir()
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((f) => f.endsWith('.tar.gz'))
    .map((f) => {
      const stat = statSync(join(dir, f))
      return {
        name: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString()
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function startBackupScheduler(): void {
  stopBackupScheduler()

  // Run daily at 3:00 AM
  scheduledBackup = cron.schedule('0 3 * * *', async () => {
    try {
      const s = await getSettings()
      if (s.autoBackup === false) return
      await createAutoBackup()
    } catch (err) {
      logger.error('app', 'Scheduled backup failed', {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
    }
  })

  logger.info('app', 'Backup scheduler started (daily at 3:00 AM)')
}

export function stopBackupScheduler(): void {
  if (scheduledBackup) {
    scheduledBackup.stop()
    scheduledBackup = null
  }
}
