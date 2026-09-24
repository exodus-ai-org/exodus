import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Real SQL against a real, in-memory PGlite with migrations through 0009
// applied — proves the generated migration and the schema agree, same
// pattern as undo.test.ts / instruction-changes.test.ts.
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))

vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0009')
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const { createMemory, hardDeleteMemory, logMemoryUsage, getMemoryUsageByChat } =
  await import('@main/lib/db/memory-queries')
const { LOCAL_USER_ID } = await import('@main/lib/ai/memory/manager')

const CHAT = '11111111-1111-4111-8111-111111111111'
const OTHER_CHAT = '99999999-9999-4999-8999-999999999999'
const RUN1 = 'a0000000-0000-4000-8000-000000000001'
const RUN2 = 'a0000000-0000-4000-8000-000000000002'

afterAll(async () => {
  await pglite.close()
})

describe('memory_usage_log (migration 0009: runId, key, section)', () => {
  it('logMemoryUsage writes runId/key/section and getMemoryUsageByChat reads them back grouped by run', async () => {
    const m1 = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'topic',
      key: 'Classical Music',
      summary: 's1',
      source: 'implicit'
    })
    const m2 = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'profile',
      key: 'Work setup',
      summary: 's2',
      source: 'implicit'
    })

    // Two memories used in the same run.
    await logMemoryUsage({
      memoryId: m1.id,
      sessionId: CHAT,
      runId: RUN1,
      key: m1.key,
      section: m1.section,
      reason: 'read-filter'
    })
    await logMemoryUsage({
      memoryId: m2.id,
      sessionId: CHAT,
      runId: RUN1,
      key: m2.key,
      section: m2.section,
      reason: 'read-filter'
    })
    // The same entry logged twice in the same run (e.g. a retried request) —
    // getMemoryUsageByChat de-duplicates it.
    await logMemoryUsage({
      memoryId: m1.id,
      sessionId: CHAT,
      runId: RUN1,
      key: m1.key,
      section: m1.section,
      reason: 'read-filter'
    })
    // A second run of the same chat.
    await logMemoryUsage({
      memoryId: m2.id,
      sessionId: CHAT,
      runId: RUN2,
      key: m2.key,
      section: m2.section,
      reason: 'read-filter'
    })
    // A different chat entirely — must not leak into CHAT's usage.
    await logMemoryUsage({
      memoryId: m1.id,
      sessionId: OTHER_CHAT,
      runId: RUN1,
      key: m1.key,
      section: m1.section,
      reason: 'read-filter'
    })
    // Old data from before the migration: no runId. getMemoryUsageByChat
    // skips it rather than erroring or grouping it under "null".
    await pglite.exec(`
      INSERT INTO "memory_usage_log" ("memoryId", "sessionId", "reason")
      VALUES ('${m2.id}', '${CHAT}', 'read-filter')
    `)

    const usage = await getMemoryUsageByChat(CHAT)

    expect(Object.keys(usage).sort()).toEqual([RUN1, RUN2].sort())
    expect(usage[RUN1]).toEqual([
      { id: m1.id, key: 'Classical Music', section: 'topic' },
      { id: m2.id, key: 'Work setup', section: 'profile' }
    ])
    expect(usage[RUN2]).toEqual([
      { id: m2.id, key: 'Work setup', section: 'profile' }
    ])
  })

  it('keeps the logged key/section after the memory row itself is deleted', async () => {
    const m = await createMemory({
      userId: LOCAL_USER_ID,
      section: 'person',
      key: 'Gerald',
      summary: 'The plant',
      source: 'explicit'
    })
    await logMemoryUsage({
      memoryId: m.id,
      sessionId: CHAT,
      runId: RUN2,
      key: m.key,
      section: m.section,
      reason: 'read-filter'
    })

    await hardDeleteMemory(m.id)

    const usage = await getMemoryUsageByChat(CHAT)
    expect(usage[RUN2]).toContainEqual({
      id: m.id,
      key: 'Gerald',
      section: 'person'
    })
  })
})

describe('memory_usage_log columns are nullable (old rows carry no runId/key/section)', () => {
  beforeEach(async () => {
    await pglite.exec(`DELETE FROM "memory_usage_log"`)
  })

  it('accepts an insert with only the pre-existing columns', async () => {
    await expect(
      pglite.exec(`
        INSERT INTO "memory_usage_log" ("memoryId", "sessionId", "reason")
        VALUES ('${CHAT}', '${CHAT}', 'legacy')
      `)
    ).resolves.not.toThrow()
  })
})
