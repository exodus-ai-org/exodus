import { resolve } from 'path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Integration test — runs the REAL Drizzle migrations (`resources/drizzle`,
 * including `0003_*` which adds `settings.appearance`) against an in-memory
 * PGlite, then round-trips an appearance value through the real
 * `updateSettings` / `getSettings` queries.
 *
 * Why it exists: Drizzle's `buildUpdateSet` iterates the TABLE's columns, so a
 * payload key the schema doesn't know is silently dropped — the request
 * succeeds, nothing is stored. That is exactly what happens when a renderer
 * with the Appearance page talks to a main process built before the column
 * existed. This test pins the column, the migration and the jsonb round trip
 * together so the schema/migration pair can't drift apart again.
 */
vi.mock('@main/lib/db/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { vector } = await import('@electric-sql/pglite-pgvector')
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm')
  const { pgmq } = await import('@electric-sql/pglite-pgmq')
  const { drizzle } = await import('drizzle-orm/pglite')
  const pglite = new PGlite({ extensions: { vector, pg_trgm, pgmq } })
  return { pglite, db: drizzle(pglite) }
})
vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}))

const { pglite, db } = await import('@main/lib/db/db')
const { getSettings, updateSettings } = await import('@main/lib/db/queries')
const { migrate } = await import('drizzle-orm/pglite/migrator')

const APPEARANCE = {
  light: { preset: 'github', accent: null, background: null, foreground: null },
  dark: {
    preset: 'custom',
    accent: '#1f6feb',
    background: '#0d1117',
    foreground: '#e6edf3'
  },
  uiFont: { family: 'mono' as const, weight: 'medium' as const },
  contentFont: { family: 'ui' as const, weight: 'light' as const },
  translucentSidebar: false,
  contrast: 70
}

beforeAll(async () => {
  await pglite.waitReady
  await pglite.exec('CREATE EXTENSION IF NOT EXISTS vector;')
  await pglite.exec('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../../../../../resources/drizzle')
  })
}, 120_000)

afterAll(async () => {
  await pglite.close()
})

describe('settings.appearance (real migrations + queries)', () => {
  it('the migrations create the appearance jsonb column', async () => {
    const result = await pglite.query<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'settings' AND column_name = 'appearance'`
    )
    expect(result.rows).toEqual([{ data_type: 'jsonb' }])
  })

  it('round-trips an appearance value through updateSettings/getSettings', async () => {
    const before = await getSettings()
    expect(before.appearance).toBeNull()

    await updateSettings({ ...before, appearance: APPEARANCE })

    const after = await getSettings()
    expect(after.appearance).toEqual(APPEARANCE)
  })
})
