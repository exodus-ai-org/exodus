import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const current = vi.fn()
const verify = vi.fn()
const syncLan = vi.fn(async () => {})
vi.mock('@main/lib/lan', () => ({
  pairing: { current: () => current(), verify: (code: string) => verify(code) },
  syncLan: () => syncLan()
}))

const registerDevice = vi.fn(async () => ({
  deviceId: 'dev-1',
  token: 'TOKEN'
}))
vi.mock('@main/lib/lan/devices', () => ({
  registerDevice: (name: string) => registerDevice(name)
}))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { default: pairRouter } = await import('@main/lib/server/routes/pair')
const { errorHandler } =
  await import('@main/lib/server/middlewares/error-handler')

const app = new Hono()
app.route('/api/v1/pair', pairRouter)
app.onError(errorHandler)

const post = (body: unknown) =>
  app.request('/api/v1/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

beforeEach(() => {
  vi.clearAllMocks()
  current.mockReturnValue({ code: 'right', expiresAt: Date.now() + 60_000 })
  verify.mockImplementation((code: string) =>
    code === 'right' ? 'ok' : 'wrong'
  )
})

describe('POST /api/v1/pair', () => {
  it('does not exist outside a pairing window', async () => {
    current.mockReturnValue(null)
    const res = await post({ code: 'right', deviceName: 'iPhone' })

    expect(res.status).toBe(404)
    expect(verify).not.toHaveBeenCalled()
    expect(registerDevice).not.toHaveBeenCalled()
  })

  it('refuses a wrong code and registers nothing', async () => {
    const res = await post({ code: 'guess', deviceName: 'iPhone' })

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('PAIRING_CODE_INVALID')
    expect(registerDevice).not.toHaveBeenCalled()
  })

  it('answers 404 once the guesses have closed the window', async () => {
    verify.mockReturnValue('closed')
    expect((await post({ code: 'guess', deviceName: 'iPhone' })).status).toBe(
      404
    )
  })

  it('pairs with the right code: registers the device, returns its token once, resyncs the listener', async () => {
    const res = await post({ code: 'right', deviceName: '  Yancey’s iPhone  ' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deviceId: 'dev-1', token: 'TOKEN' })
    expect(registerDevice).toHaveBeenCalledWith('Yancey’s iPhone')
    expect(syncLan).toHaveBeenCalled()
  })

  it.each([
    ['no device name', { code: 'right' }],
    ['a blank device name', { code: 'right', deviceName: '   ' }],
    ['no code', { deviceName: 'iPhone' }],
    ['an oversized name', { code: 'right', deviceName: 'x'.repeat(65) }]
  ])('rejects %s without spending the code', async (_label, body) => {
    const res = await post(body)

    expect(res.status).toBe(400)
    expect(verify).not.toHaveBeenCalled()
    expect(registerDevice).not.toHaveBeenCalled()
  })
})
