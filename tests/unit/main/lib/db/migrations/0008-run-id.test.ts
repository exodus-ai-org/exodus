import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createMigratedPglite,
  migrationFile,
  migrationSql
} from '../../../../helpers/migrated-pglite'

let pglite: PGlite

const CHAT = '11111111-1111-4111-8111-111111111111'
const ORPHAN_CHAT = '22222222-2222-4222-8222-222222222222'
const U1 = 'a0000000-0000-4000-8000-000000000001'
const U2 = 'a0000000-0000-4000-8000-000000000005'
const ORPHAN = 'b0000000-0000-4000-8000-000000000001'

beforeAll(async () => {
  pglite = await createMigratedPglite('0007')
  await pglite.exec(
    `INSERT INTO "chat" ("id","title") VALUES ('${CHAT}','t'), ('${ORPHAN_CHAT}','o')`
  )
  // Two runs: a user row, a tool step, its result, the answer; then a second
  // user row and its answer. The tool result shares its createdAt with the
  // step before it (a tie the ordering must not care about).
  await pglite.exec(`
    INSERT INTO "message" ("id","chatId","role","content","createdAt") VALUES
    ('${U1}','${CHAT}','user','[]','2026-01-01T00:00:00Z'),
    ('a0000000-0000-4000-8000-000000000002','${CHAT}','assistant','[]','2026-01-01T00:00:01Z'),
    ('a0000000-0000-4000-8000-000000000003','${CHAT}','toolResult','[]','2026-01-01T00:00:01Z'),
    ('a0000000-0000-4000-8000-000000000004','${CHAT}','assistant','[]','2026-01-01T00:00:03Z'),
    ('${U2}','${CHAT}','user','[]','2026-01-01T00:01:00Z'),
    ('a0000000-0000-4000-8000-000000000006','${CHAT}','assistant','[]','2026-01-01T00:01:00Z')
  `)
  // An orphan: an assistant row with no user row before it (a chat imported
  // mid-run). It becomes a run of its own.
  await pglite.exec(`
    INSERT INTO "message" ("id","chatId","role","content","createdAt") VALUES
    ('${ORPHAN}','${ORPHAN_CHAT}','assistant','[]','2026-01-01T00:00:00Z')
  `)
  await pglite.exec(migrationSql(migrationFile('0008')))
}, 60_000)

afterAll(async () => {
  await pglite.close()
})

describe('migration 0008: message.runId', () => {
  it('gives every row of a run the id of its user message', async () => {
    const { rows } = await pglite.query<{ id: string; runId: string }>(
      `SELECT "id","runId" FROM "message" WHERE "chatId" = '${CHAT}' ORDER BY "createdAt", "id"`
    )
    expect(rows.map((r) => r.runId)).toEqual([U1, U1, U1, U1, U2, U2])
  })

  it('an orphan row is its own run', async () => {
    const { rows } = await pglite.query<{ runId: string }>(
      `SELECT "runId" FROM "message" WHERE "id" = '${ORPHAN}'`
    )
    expect(rows[0].runId).toBe(ORPHAN)
  })

  it('the column is NOT NULL and indexed with chatId', async () => {
    const { rows } = await pglite.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'message' AND indexname = 'message_chat_run_idx'`
    )
    expect(rows).toHaveLength(1)
    await expect(
      pglite.exec(
        `INSERT INTO "message" ("id","chatId","role","content") VALUES ('c0000000-0000-4000-8000-000000000001','${ORPHAN_CHAT}','user','[]')`
      )
    ).rejects.toThrow(/null value in column "runId"/)
  })
})
