// src/main/lib/server/routes/maps.ts — GET /api/v1/maps/photo: a Places photo
// fetched with the user's key in main, so the key never reaches a client
// (final review I5). Mounted in a bare Hono app with the real errorHandler;
// the settings variable is what app.ts injects per request.
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
const warn = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() }
}))
const fetchPublicHttps = vi.fn()
vi.mock('@main/lib/net/safe-fetch', () => ({ fetchPublicHttps }))

const { default: mapsRouter } = await import('@main/lib/server/routes/maps')
const { errorHandler } =
  await import('@main/lib/server/middlewares/error-handler')

const KEY = 'AIzaSyTESTKEY0123456789abcdefghijkl'
const NAME = 'places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUc7tXV-abc_DEF123'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])

function appWith(key: string | null) {
  const app = new Hono<{ Variables: { settings: unknown } }>()
  app.use('*', async (c, next) => {
    c.set('settings', { googleCloud: { googleApiKey: key } })
    await next()
  })
  app.route('/api/v1/maps', mapsRouter as never)
  app.onError(errorHandler)
  return app
}

const photo = (query: string, key: string | null = KEY) =>
  appWith(key).request(`/api/v1/maps/photo?${query}`)

beforeEach(() => {
  fetchPublicHttps.mockReset()
  warn.mockReset()
})

describe('GET /api/v1/maps/photo', () => {
  it('fetches the photo from the fixed Places host with the key, and serves the bytes', async () => {
    fetchPublicHttps.mockResolvedValue({ bytes: PNG, contentType: 'image/png' })
    const res = await photo(
      new URLSearchParams({ name: NAME, maxWidth: '240' }).toString()
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe('private, max-age=86400')
    expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG)
    const [url] = fetchPublicHttps.mock.calls[0]!
    expect(url).toBe(
      `https://places.googleapis.com/v1/${NAME}/media?maxWidthPx=240&key=${KEY}`
    )
  })

  it('defaults the width to 800', async () => {
    fetchPublicHttps.mockResolvedValue({
      bytes: PNG,
      contentType: 'image/jpeg'
    })
    await photo(`name=${encodeURIComponent(NAME)}`)
    expect(fetchPublicHttps.mock.calls[0]![0]).toContain('maxWidthPx=800&')
  })

  it.each([
    '',
    'name=',
    `name=${encodeURIComponent('places/x/photos/y/../../../v1/other')}`,
    `name=${encodeURIComponent('https://evil.example/x')}`,
    `name=${encodeURIComponent('places/x/photos/y?key=z')}`,
    `name=${encodeURIComponent('places/x/photos/y#frag')}`,
    `name=${encodeURIComponent('places/x')}`,
    `name=${encodeURIComponent(NAME)}&maxWidth=0`,
    `name=${encodeURIComponent(NAME)}&maxWidth=99999`,
    `name=${encodeURIComponent(NAME)}&maxWidth=1e3`
  ])('refuses %s with a 400 before any fetch', async (query) => {
    const res = await photo(query)
    expect(res.status).toBe(400)
    expect(fetchPublicHttps).not.toHaveBeenCalled()
  })

  it('without a key it fetches nothing', async () => {
    const res = await photo(`name=${encodeURIComponent(NAME)}`, null)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(fetchPublicHttps).not.toHaveBeenCalled()
  })

  it('an upstream failure never carries the key or the upstream URL', async () => {
    fetchPublicHttps.mockRejectedValue(new Error('HTTP 403'))
    const res = await photo(`name=${encodeURIComponent(NAME)}`)
    expect(res.status).toBe(503)
    const text = await res.text()
    expect(text).not.toContain(KEY)
    expect(text).not.toContain('places.googleapis.com')
    expect(JSON.stringify(warn.mock.calls)).not.toContain(KEY)
  })

  it('a non-image answer is refused', async () => {
    fetchPublicHttps.mockResolvedValue({
      bytes: Buffer.from('<html>'),
      contentType: 'text/html'
    })
    const res = await photo(`name=${encodeURIComponent(NAME)}`)
    expect(res.status).toBe(503)
  })
})
