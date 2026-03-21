import { join } from 'path'

import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'
import { app } from 'electron'

const dbPath = join(app.getPath('userData'), 'Database')
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector }
})

export const db = drizzle(pglite)
