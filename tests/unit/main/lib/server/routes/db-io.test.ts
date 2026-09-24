// src/main/lib/server/routes/db-io.ts — "reset all data" removes the
// generated media with the chats that referenced it.
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/backup', () => ({ createAutoBackup: vi.fn(async () => {}) }))
vi.mock('@main/lib/db/queries', () => ({
  exportData: vi.fn(),
  importData: vi.fn(async () => {}),
  resetAllData: vi.fn(async () => {})
}))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))
vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: vi.fn(() => ({ elasticsearch: null, pglite: {} }))
}))
const removeAllMedia = vi.fn(async () => {})
vi.mock('@main/lib/media/store', () => ({ removeAllMedia }))

const { default: dbIo } = await import('@main/lib/server/routes/db-io')
const { resetAllData } = await import('@main/lib/db/queries')

function buildApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('settings' as never, {} as never)
    await next()
  })
  app.route('/', dbIo)
  return app
}

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/v1/db-io/reset', () => {
  it('removes ~/.exodus/media after the data is reset', async () => {
    const res = await buildApp().request('/reset', { method: 'DELETE' })

    expect(res.status).toBe(200)
    expect(vi.mocked(resetAllData)).toHaveBeenCalledOnce()
    expect(removeAllMedia).toHaveBeenCalledOnce()
  })

  it('keeps the media when the reset itself failed', async () => {
    vi.mocked(resetAllData).mockRejectedValueOnce(new Error('boom'))
    const res = await buildApp().request('/reset', { method: 'DELETE' })

    expect(res.status).not.toBe(200)
    expect(removeAllMedia).not.toHaveBeenCalled()
  })
})
