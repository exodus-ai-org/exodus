import { join } from 'path'
import { cwd } from 'process'

import { is } from '@electron-toolkit/utils'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { Notification } from 'electron'

import { logger } from '../logger'
import { db, pglite } from './db'

export const runMigrate = async () => {
  try {
    logger.info('migration', 'Running migrations...')
    const start = performance.now()
    await pglite.waitReady
    await pglite.exec('CREATE EXTENSION IF NOT EXISTS vector;')
    await migrate(db, {
      migrationsFolder: is.dev
        ? join(cwd(), './resources/drizzle')
        : join(
            process.resourcesPath,
            'app.asar.unpacked',
            'resources',
            'drizzle'
          )
    })

    // Idempotent column additions for columns that may have been missed by the migrator
    await pglite.exec(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "lastRunStatus" varchar;`
    )

    const end = performance.now()
    logger.info('migration', 'Migrations completed', {
      durationMs: end - start
    })
  } catch (error) {
    new Notification({
      title: 'Exodus',
      body:
        error instanceof Error ? error.message : 'Failed to migrate database.'
    }).show()
  }
}
