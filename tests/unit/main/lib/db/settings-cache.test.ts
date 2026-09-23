import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny stand-in for the settings table: one row, and a count of how many
// statements actually reached the database.
let row: Record<string, unknown>
let statements: string[] = []
let failNextStatement = false

function run<T>(kind: string, result: () => T): Promise<T> {
  if (failNextStatement) {
    failNextStatement = false
    return Promise.reject(new Error('disk full'))
  }
  statements.push(kind)
  return Promise.resolve(result())
}

// Just the three call shapes queries.ts uses on the settings table.
vi.mock('@main/lib/db/db', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => run('insert', () => undefined)
      })
    }),
    select: () => ({ from: () => run('select', () => [{ ...row }]) }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () =>
          run('update', () => {
            row = { ...row, ...patch }
          })
      })
    })
  },
  pglite: {}
}))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { getSettings, updateSettingField, updateSettings } =
  await import('@main/lib/db/queries')

beforeEach(async () => {
  row = { id: 'global', colorTone: 'neutral', providers: { openai: 'sk-1' } }
  // Drop whatever an earlier test left cached.
  await updateSettingField('colorTone', 'neutral')
  statements = []
})

describe('getSettings cache', () => {
  it('reads the database once, then serves repeat reads from memory', async () => {
    await getSettings()
    await getSettings()
    await getSettings()

    expect(statements).toEqual(['insert', 'select'])
  })

  it('sees a change made through updateSettingField', async () => {
    await getSettings()
    await updateSettingField('colorTone', 'rose')

    expect((await getSettings()).colorTone).toBe('rose')
  })

  it('sees a change made through updateSettings', async () => {
    const current = await getSettings()
    await updateSettings({ ...current, colorTone: 'blue' } as never)

    expect((await getSettings()).colorTone).toBe('blue')
  })

  it('hands out copies, so editing a result does not leak into the next read', async () => {
    const first = (await getSettings()) as unknown as {
      providers: { openai: string }
    }
    first.providers.openai = 'tampered'

    const second = (await getSettings()) as unknown as {
      providers: { openai: string }
    }
    expect(second.providers.openai).toBe('sk-1')
  })

  it('does not cache a row that a write overtook while it was being read', async () => {
    // The read is issued first and resolves with the pre-update row…
    const staleRead = getSettings()
    // …while an update lands before that read gets to fill the cache.
    await updateSettingField('colorTone', 'violet')
    await staleRead

    expect((await getSettings()).colorTone).toBe('violet')
  })

  it('still invalidates when the update itself fails', async () => {
    await getSettings()
    const current = await getSettings()
    row.colorTone = 'changed-behind-the-cache'
    failNextStatement = true

    await expect(updateSettings(current as never)).rejects.toThrow('disk full')
    expect((await getSettings()).colorTone).toBe('changed-behind-the-cache')
  })
})
