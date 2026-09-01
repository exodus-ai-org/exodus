import { PGlite } from '@electric-sql/pglite'
import { pgmq } from '@electric-sql/pglite-pgmq'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'

import { getDatabaseDir } from '../paths'

const dbPath = getDatabaseDir()
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector, pgmq, pg_trgm }
})

export const db = drizzle(pglite)
