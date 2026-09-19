import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { isAllowedHost, isAllowedOrigin, originGate } =
  await import('@main/lib/server/middlewares/origin-gate')

describe('isAllowedOrigin', () => {
  it.each([
    // Includes the packaged renderer: a file:// page in Electron sends none.
    [
      'no Origin header (exodus-ios, exodus-cli, curl, the packaged app)',
      undefined
    ],
    ['the dev renderer', 'http://localhost:5173'],
    ['a loopback IP', 'http://127.0.0.1:5173'],
    ['IPv6 loopback', 'http://[::1]:5173']
  ])('allows %s', (_label, origin) => {
    expect(isAllowedOrigin(origin)).toBe(true)
  })

  it.each([
    ['a website', 'https://evil.example'],
    ['a plain-http website', 'http://evil.example'],
    ['a site on the API port', 'http://evil.example:60223'],
    ['a lookalike of localhost', 'http://localhost.evil.example'],
    ['a LAN web page', 'http://192.168.1.20:8080'],
    // What a sandboxed iframe on a hostile page sends. Exodus never does.
    ['an opaque origin', 'null'],
    ['a browser extension', 'chrome-extension://abcdefghijklmnop'],
    ['a file origin', 'file://'],
    ['garbage', 'not a url']
  ])('rejects %s', (_label, origin) => {
    expect(isAllowedOrigin(origin)).toBe(false)
  })
})

describe('isAllowedHost', () => {
  const LOOPBACK = '127.0.0.1'

  it.each([
    ['localhost:60223'],
    ['127.0.0.1:60223'],
    ['[::1]:60223'],
    ['192.168.1.10:60223'],
    ['mac.local:60223']
  ])('lets a loopback client address the server as %s', (host) => {
    expect(isAllowedHost(host, LOOPBACK)).toBe(true)
  })

  it('rejects a loopback client that addresses the server by a public name (DNS rebinding)', () => {
    expect(isAllowedHost('evil.example:60223', LOOPBACK)).toBe(false)
    expect(isAllowedHost('evil.example:60223', '::1')).toBe(false)
    expect(isAllowedHost('evil.example:60223', '::ffff:127.0.0.1')).toBe(false)
  })

  it('does not hold a LAN client (exodus-ios) to any particular name', () => {
    expect(isAllowedHost('mac.tailnet.ts.net:60223', '100.64.0.7')).toBe(true)
    expect(isAllowedHost('exodus.example.com', '192.168.1.30')).toBe(true)
  })

  it('passes when there is nothing to judge (no Host, or no socket under app.request())', () => {
    expect(isAllowedHost(undefined, LOOPBACK)).toBe(true)
    expect(isAllowedHost('evil.example', undefined)).toBe(true)
  })
})

describe('originGate', () => {
  function buildApp() {
    const app = new Hono()
    app.use('*', originGate)
    app.use('*', cors())
    app.get('/api/v1/settings', (c) => c.json({ apiKey: 'sk-secret' }))
    app.post('/api/v1/chat', (c) => c.json({ ok: true }))
    return app
  }

  it('serves a request with no Origin', async () => {
    const res = await buildApp().request('/api/v1/settings')
    expect(res.status).toBe(200)
  })

  it('serves the renderer', async () => {
    const res = await buildApp().request('/api/v1/settings', {
      headers: { Origin: 'http://localhost:5173' }
    })
    expect(res.status).toBe(200)
  })

  it('refuses a website, without a body worth reading or a CORS grant', async () => {
    const res = await buildApp().request('/api/v1/settings', {
      headers: { Origin: 'https://evil.example' }
    })
    expect(res.status).toBe(403)
    expect(await res.text()).not.toContain('sk-secret')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('refuses an opaque origin — a sandboxed iframe on a hostile page', async () => {
    const res = await buildApp().request('/api/v1/settings', {
      headers: { Origin: 'null' }
    })
    expect(res.status).toBe(403)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it("refuses a website's preflight, so its real request is never sent", async () => {
    const res = await buildApp().request('/api/v1/chat', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'POST'
      }
    })
    expect(res.status).toBe(403)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('refuses a rebinding request that reaches it over loopback', async () => {
    const res = await buildApp().request(
      '/api/v1/settings',
      { headers: { Host: 'evil.example:60223' } },
      { incoming: { socket: { remoteAddress: '127.0.0.1' } } }
    )
    expect(res.status).toBe(403)
  })
})
