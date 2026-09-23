import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'

const DRIZZLE = resolve(import.meta.dirname, '../../../resources/drizzle')

/** The migration file for an index (`'0007'`), whatever its random suffix. */
export function migrationFile(index: string): string {
  const name = readdirSync(DRIZZLE).find(
    (n) => n.startsWith(`${index}_`) && n.endsWith('.sql')
  )
  if (!name) throw new Error(`No migration ${index}_*.sql in ${DRIZZLE}`)
  return name
}

export function migrationSql(file: string): string {
  return readFileSync(resolve(DRIZZLE, file), 'utf8').replaceAll(
    '--> statement-breakpoint',
    ''
  )
}

/**
 * A real, in-memory PGlite with the generated migrations applied in journal
 * order up to and including `upTo` (`'0006'`) — the pattern of
 * `jobs/queries.integration.test.ts`, so a migration test proves the SQL that
 * ships. `pg_trgm` and `vector` are what `db/migrate.ts` creates before it
 * migrates; 0000 needs the first for the message search index.
 */
export async function createMigratedPglite(upTo: string): Promise<PGlite> {
  const pglite = new PGlite({ extensions: { pg_trgm, vector } })
  await pglite.waitReady
  await pglite.exec('CREATE EXTENSION IF NOT EXISTS vector;')
  await pglite.exec('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
  const files = readdirSync(DRIZZLE)
    .filter((n) => n.endsWith('.sql') && n.slice(0, 4) <= upTo)
    .sort()
  for (const file of files) await pglite.exec(migrationSql(file))
  return pglite
}
