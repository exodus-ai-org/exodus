import { mkdirSync } from 'fs'

import { PGlite } from '@electric-sql/pglite'
import { pgmq } from '@electric-sql/pglite-pgmq'
import { vector } from '@electric-sql/pglite-pgvector'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'

import { getDatabaseDir } from '../paths'

// PGlite's own dataDir mkdir isn't recursive — it needs the parent
// (`getExodusHome()`) to already exist. This module is evaluated at import
// time (ES module hoisting), before `app.on('ready')`'s `ensureExodusDirs()`
// call ever runs, so it can't rely on that — it must create its own
// directory tree up front.
const dbPath = getDatabaseDir()
mkdirSync(dbPath, { recursive: true })
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector, pgmq, pg_trgm }
})

export const db = drizzle(pglite)
