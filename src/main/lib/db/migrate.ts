import { is } from '@electron-toolkit/utils'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { Notification } from 'electron'
import { join } from 'path'
import { cwd } from 'process'
import { db, pglite } from './db'

export const runMigrate = async () => {
  try {
    console.log('⏳ Running migrations...')
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
    const end = performance.now()
    console.log('✅ Migrations completed in', end - start, 'ms')
  } catch (error) {
    new Notification({
      title: 'Exodus',
      body:
        error instanceof Error ? error.message : 'Failed to migrate database.'
    }).show()
  }
}
