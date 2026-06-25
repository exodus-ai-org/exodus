import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

const locked = { value: false }
vi.mock('../../lock/lock-manager', () => ({
  getLockManager: () => ({ isLocked: () => locked.value })
}))

async function makeApp() {
  const { lockGate } = await import('./lock-gate')
  const app = new Hono()
  app.use('/api/*', lockGate)
  app.get('/api/ping', (c) => c.json({ ok: true }))
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
    expect(body.error.code).toBe('LOCKED')
  })
})
