import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createMigratedPglite,
  migrationFile,
  migrationSql
} from '../../../../helpers/migrated-pglite'

let pglite: PGlite

const CHAT = '11111111-1111-4111-8111-111111111111'
const U1 = 'a0000000-0000-4000-8000-000000000001'
const A1 = 'a0000000-0000-4000-8000-000000000002'

beforeAll(async () => {
  pglite = await createMigratedPglite('0010')
  await pglite.exec(`INSERT INTO "chat" ("id","title") VALUES ('${CHAT}','t')`)
  await pglite.exec(`
    INSERT INTO "message" ("id","chatId","runId","role","content","createdAt") VALUES
    ('${U1}','${CHAT}','${U1}','user','[]','2026-01-01T00:00:00Z'),
    ('${A1}','${CHAT}','${U1}','assistant','[]','2026-01-01T00:00:01Z')
  `)
  await pglite.exec(migrationSql(migrationFile('0011')))
}, 60_000)

afterAll(async () => {
  await pglite.close()
})

describe('migration 0011: message.alternateOf / message.attempt', () => {
  it('applies on a database with rows and backfills nothing', async () => {
    const { rows } = await pglite.query<{
      id: string
      alternateOf: string | null
      attempt: string | null
    }>(
      `SELECT "id","alternateOf","attempt" FROM "message" ORDER BY "createdAt"`
    )
    expect(rows).toEqual([
      { id: U1, alternateOf: null, attempt: null },
      { id: A1, alternateOf: null, attempt: null }
    ])
  })

  it('adds both columns nullable', async () => {
    const { rows } = await pglite.query<{
      column_name: string
      is_nullable: string
      data_type: string
    }>(
      `SELECT column_name, is_nullable, data_type FROM information_schema.columns
       WHERE table_name = 'message' AND column_name IN ('alternateOf','attempt')
       ORDER BY column_name`
    )
    expect(rows).toEqual([
      { column_name: 'alternateOf', is_nullable: 'YES', data_type: 'uuid' },
      {
        column_name: 'attempt',
        is_nullable: 'YES',
        data_type: 'character varying'
      }
    ])
  })
})
