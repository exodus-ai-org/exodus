import { migrate } from 'drizzle-orm/pglite/migrator'
import { join } from 'path'
import { cwd } from 'process'
import { db } from './db'

export const runMigrate = async () => {
  console.log('⏳ Running migrations...')
  console.log(join(cwd(), 'src/main/lib/db/migrations'))
  const start = Date.now()
  await migrate(db, {
    migrationsFolder: join(cwd(), 'src/main/lib/db/migrations')
  })
  const end = Date.now()
  console.log('✅ Migrations completed in', end - start, 'ms')
}
