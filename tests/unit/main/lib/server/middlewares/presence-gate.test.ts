import {
  getPresenceToken,
  isPresenceToken,
  PRESENCE_HEADER
} from '@main/lib/presence'
import { presenceGate } from '@main/lib/server/middlewares/presence-gate'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

const app = new Hono()
app.use('/api/*', presenceGate)
app.post('/api/v1/chat/approval', (c) => c.text('answered'))
app.get('/api/v1/devices', (c) => c.text('devices'))
app.post('/api/v1/devices/pairing', (c) => c.text('pairing open'))
app.post('/api/v1/chat', (c) => c.text('chat'))
app.get('/api/v1/devices-and-more', (c) => c.text('not devices'))

const withToken = { headers: { [PRESENCE_HEADER]: getPresenceToken() } }

describe('presenceGate', () => {
  it.each([
    ['POST', '/api/v1/chat/approval'],
    ['GET', '/api/v1/devices'],
    // Opening a pairing window hands out its code: the model could pair
    // itself a device and approve over the LAN.
    ['POST', '/api/v1/devices/pairing']
  ])(
    'refuses %s %s on loopback without the window token (a curl from the terminal tool)',
    async (method, path) => {
      for (const headers of [
        {},
        { [PRESENCE_HEADER]: 'guess' },
        { [PRESENCE_HEADER]: getPresenceToken().slice(1) }
      ]) {
        const res = await app.request(path, { method, headers })
        expect(res.status).toBe(403)
        expect((await res.json()).error.code).toBe('PRESENCE_REQUIRED')
      }
      const ok = await app.request(path, { method, ...withToken })
      expect(ok.status).toBe(200)
    }
  )

  it('lets the LAN listener through: authGate already required a device token', async () => {
    const res = await app.request(
      '/api/v1/chat/approval',
      { method: 'POST' },
      { listener: 'lan' }
    )
    expect(res.status).toBe(200)
  })

  it('leaves every other route alone', async () => {
    expect((await app.request('/api/v1/chat', { method: 'POST' })).status).toBe(
      200
    )
    expect((await app.request('/api/v1/devices-and-more')).status).toBe(200)
  })

  it('the token is stable for the launch and compared exactly', () => {
    expect(getPresenceToken()).toBe(getPresenceToken())
    expect(getPresenceToken()).toMatch(/^[\w-]{43}$/u)
    expect(isPresenceToken(getPresenceToken())).toBe(true)
    expect(isPresenceToken(undefined)).toBe(false)
    expect(isPresenceToken('')).toBe(false)
  })
})
