import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const locked = { value: false }
const isLocked = vi.fn(() => locked.value)
const completeUnlock = vi.fn(() => {
  locked.value = false
})
vi.mock('@main/lib/lock/lock-manager', () => ({
  getLockManager: () => ({ isLocked, completeUnlock })
}))

const info = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { info, warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { default: lockRouter } = await import('@main/lib/server/routes/lock')

function makeApp(deviceId?: string) {
  const app = new Hono<{ Variables: { deviceId?: string } }>()
  app.use('/api/v1/lock/*', async (c, next) => {
    if (deviceId) c.set('deviceId', deviceId)
    await next()
  })
  app.route('/api/v1/lock', lockRouter)
  return app
}

const post = (app: Hono) =>
  app.request('/api/v1/lock/unlock', { method: 'POST' })

beforeEach(() => {
  vi.clearAllMocks()
  locked.value = false
})

describe('POST /api/v1/lock/unlock', () => {
  it('unlocks when locked, logging the device that did it', async () => {
    locked.value = true
    const res = await post(makeApp('dev-1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ locked: false })
    expect(completeUnlock).toHaveBeenCalledOnce()
    expect(info).toHaveBeenCalledWith('app', 'Unlocked by a paired device', {
      deviceId: 'dev-1'
    })
  })

  it('logs "loopback" when authGate set no deviceId', async () => {
    locked.value = true
    await post(makeApp())

    expect(info).toHaveBeenCalledWith('app', 'Unlocked by a paired device', {
      deviceId: 'loopback'
    })
  })

  it('is a no-op, and logs nothing, when already unlocked', async () => {
    locked.value = false
    const res = await post(makeApp('dev-1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ locked: false })
    expect(completeUnlock).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
  })
})
