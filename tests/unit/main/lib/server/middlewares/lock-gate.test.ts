import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

const locked = { value: false }
vi.mock('@main/lib/lock/lock-manager', () => ({
  getLockManager: () => ({ isLocked: () => locked.value })
}))
vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn() }
}))

async function makeApp() {
  const { lockGate } = await import('@main/lib/server/middlewares/lock-gate')
  const { errorHandler } =
    await import('@main/lib/server/middlewares/error-handler')
  const app = new Hono()
  app.use('/api/*', lockGate)
  app.get('/api/ping', (c) => c.json({ ok: true }))
  app.onError(errorHandler)
  return app
}

describe('lockGate', () => {
  it('passes through when unlocked', async () => {
    locked.value = false
    const app = await makeApp()
    const res = await app.request('/api/ping')
    expect(res.status).toBe(200)
  })

  it('returns 423 when locked', async () => {
    locked.value = true
    const app = await makeApp()
    const res = await app.request('/api/ping')
    expect(res.status).toBe(423)
    const body = await res.json()
    expect(body.error.code).toBe('APP_LOCKED')
  })
})
