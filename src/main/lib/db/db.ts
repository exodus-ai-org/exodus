import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'

import { getDatabaseDir } from '../paths'

const dbPath = getDatabaseDir()
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector }
})

export const db = drizzle(pglite)
