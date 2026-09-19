import { createHash } from 'crypto'
import { mkdtempSync, rmSync } from 'fs'
import http from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import tls from 'tls'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * The whole LAN path with nothing faked but the database table and Electron:
 * a real certificate, a real HTTPS listener (on an ephemeral port), the real
 * auth gate and pairing route, and a client that — like exodus-ios — trusts
 * the pinned certificate and nothing else.
 */
const tlsDir = mkdtempSync(join(tmpdir(), 'exodus-lan-'))

vi.mock('electron', () => ({
  safeStorage: { isEncryptionAvailable: () => false }
}))
vi.mock('@main/lib/paths', () => ({ getTlsDir: () => tlsDir }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

interface Row {
  id: string
  name: string
  tokenHash: string
  createdAt: Date
  lastSeenAt: Date | null
}
let rows: Row[] = []
vi.mock('@main/lib/db/device-queries', () => ({
  insertDevice: async (row: { name: string; tokenHash: string }) => {
    const device = {
      id: `dev-${rows.length + 1}`,
      createdAt: new Date(),
      lastSeenAt: null,
      ...row
    }
    rows.push(device)
    return device
  },
  listDeviceRows: async () => rows.map((r) => ({ ...r })),
  deleteDevice: async (id: string) => {
    rows = rows.filter((r) => r.id !== id)
  },
  deleteAllDevices: async () => {
    rows = []
  },
  touchDevice: async () => {}
}))

const { authGate } = await import('@main/lib/server/middlewares/auth-gate')
const { errorHandler } =
  await import('@main/lib/server/middlewares/error-handler')
const { default: pairRouter } = await import('@main/lib/server/routes/pair')
const { pairing } = await import('@main/lib/lan')
const { loadOrCreateCertificate } = await import('@main/lib/lan/certificate')
const { revokeDevice } = await import('@main/lib/lan/devices')
const { createLanListener } = await import('@main/lib/lan/listener')

const app = new Hono<{ Variables: { deviceId?: string } }>()
app.use('/api/*', authGate)
app.route('/api/v1/pair', pairRouter)
app.get('/api/v1/history', (c) => c.json({ device: c.get('deviceId') }))
app.onError(errorHandler)

const listener = createLanListener({
  fetch: (request, env) => app.fetch(request, env),
  wanted: async () => true,
  certificate: loadOrCreateCertificate,
  serve,
  port: 0
})

let pin = ''
let port = 0

/** Resolves only once the peer's certificate has been checked against `expected`. */
function pinnedSocket(expected: string) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    // Self-signed by design: there is no CA to verify against, and the
    // fingerprint comparison below *is* the verification — made before a single
    // byte of a request (least of all a bearer token) is written.
    const socket = tls.connect(
      { host: '127.0.0.1', port, rejectUnauthorized: false },
      () => {
        const seen = createHash('sha256')
          .update(socket.getPeerCertificate().raw)
          .digest('base64url')
        if (seen === expected) return resolve(socket)
        socket.destroy()
        reject(new Error('certificate does not match the pin'))
      }
    )
    socket.once('error', reject)
  })
}

async function call(
  path: string,
  init: { method?: string; token?: string; json?: unknown; pin?: string } = {}
) {
  const socket = await pinnedSocket(init.pin ?? pin)
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const body = init.json === undefined ? undefined : JSON.stringify(init.json)
    const req = http.request(
      {
        createConnection: () => socket,
        host: '127.0.0.1',
        port,
        path,
        method: init.method ?? 'GET',
        headers: {
          connection: 'close',
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(init.token ? { authorization: `Bearer ${init.token}` } : {})
        }
      },
      (res) => {
        let text = ''
        res.on('data', (d) => (text += d))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: text })
        )
      }
    )
    req.on('error', reject)
    req.end(body)
  })
}

beforeAll(async () => {
  pin = (await loadOrCreateCertificate()).fingerprint
  await listener.sync()
  port = listener.port() ?? 0
  expect(port).toBeGreaterThan(0)
})

afterAll(() => {
  listener.stop()
  rmSync(tlsDir, { recursive: true, force: true })
})

describe('LAN access, end to end', () => {
  it('presents exactly the certificate whose fingerprint goes into the QR code', async () => {
    await expect(call('/api/v1/history')).resolves.toMatchObject({
      status: 401
    })
    await expect(
      call('/api/v1/history', { pin: 'A'.repeat(43) })
    ).rejects.toThrow('does not match the pin')
  })

  it('pairs a device, serves it, and locks it out the moment it is revoked', async () => {
    // No window: there is nothing to pair with.
    const closed = await call('/api/v1/pair', {
      method: 'POST',
      json: { code: 'anything', deviceName: 'iPhone' }
    })
    expect(closed.status).toBe(404)

    const { code } = pairing.open()

    const wrong = await call('/api/v1/pair', {
      method: 'POST',
      json: { code: 'not-the-code', deviceName: 'iPhone' }
    })
    expect(wrong.status).toBe(403)

    const paired = await call('/api/v1/pair', {
      method: 'POST',
      json: { code, deviceName: 'iPhone' }
    })
    expect(paired.status).toBe(200)
    const { deviceId, token } = JSON.parse(paired.body)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)

    // The code was single-use.
    const again = await call('/api/v1/pair', {
      method: 'POST',
      json: { code, deviceName: 'someone else' }
    })
    expect(again.status).toBe(404)

    const served = await call('/api/v1/history', { token })
    expect(served.status).toBe(200)
    expect(JSON.parse(served.body)).toEqual({ device: deviceId })

    expect((await call('/api/v1/history', { token: `${token}x` })).status).toBe(
      401
    )

    await revokeDevice(deviceId)
    expect((await call('/api/v1/history', { token })).status).toBe(401)
  })
})
