// The MCP API hands out masks only (spec 2026-09-25 §2.2): every `env` and
// `headers` value, and any secret-named value inside `extraConfig`, leaves as
// a mask; a posted mask keeps what is stored. Real SQL on an in-memory PGlite.
import { isAppError } from '@exodus/shared/errors/app-error'
import { Hono } from 'hono'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0009')
  return { pglite, db: drizzle(pglite) }
})
vi.mock('@main/lib/ai/mcp', () => ({
  getMcpTools: vi.fn(async () => []),
  invalidateAllMcpCache: vi.fn(),
  invalidateMcpCache: vi.fn()
}))

const { pglite } = await import('@main/lib/db/db')
const mcpQueries = await import('@main/lib/db/mcp-queries')
const { default: mcpRouter } = await import('@main/lib/server/routes/mcp')

afterAll(async () => {
  await pglite.close()
})

function buildApp() {
  const app = new Hono()
  app.route('/api/v1/mcp', mcpRouter)
  app.onError((err, c) => {
    if (isAppError(err)) return c.json(err.toJSON(), err.statusCode as never)
    return c.json({ message: err.message }, 500)
  })
  return app
}

const ENV_SECRET = 'ghp_env-token-value-AAAA'
const HEADER_SECRET = 'Bearer header-token-BBBB'
const OAUTH_SECRET = 'oauth-client-secret-CCCC'

let id: string

beforeEach(async () => {
  await pglite.exec('DELETE FROM mcp_server;')
  const row = await mcpQueries.createMcpServer({
    name: 'github',
    transportType: 'streamable-http',
    url: 'https://mcp.example.com',
    env: { GITHUB_TOKEN: ENV_SECRET, SHORT: 'abc' },
    headers: { Authorization: HEADER_SECRET },
    extraConfig: {
      oauth: { clientId: 'public-client-id', clientSecret: OAUTH_SECRET },
      timeout: 30
    }
  })
  id = row!.id
})

const send = (method: string, path: string, body: unknown) =>
  buildApp().request(`/api/v1/mcp${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

describe('GET /api/v1/mcp', () => {
  it('masks env and headers values and secret-named extraConfig values', async () => {
    const res = await buildApp().request('/api/v1/mcp')
    const text = await res.clone().text()
    const [server] = (await res.json()) as Array<Record<string, never>>

    expect(server.env).toEqual({ GITHUB_TOKEN: '•••• AAAA', SHORT: '••••' })
    expect(server.headers).toEqual({ Authorization: '•••• BBBB' })
    expect(server.extraConfig).toEqual({
      oauth: { clientId: 'public-client-id', clientSecret: '•••• CCCC' },
      timeout: 30
    })
    for (const s of [ENV_SECRET, HEADER_SECRET, OAUTH_SECRET])
      expect(text).not.toContain(s)
  })

  it('leaves the stored row in plaintext', async () => {
    const row = await mcpQueries.getMcpServerById(id)
    expect(row!.env).toEqual({ GITHUB_TOKEN: ENV_SECRET, SHORT: 'abc' })
  })
})

describe('PUT /api/v1/mcp/:id', () => {
  it('a form posting back the masks it was shown keeps every secret', async () => {
    const res = await send('PUT', `/${id}`, {
      name: 'github',
      description: 'edited',
      env: { GITHUB_TOKEN: '•••• AAAA', SHORT: '••••' },
      headers: { Authorization: '•••• BBBB' },
      extraConfig: {
        oauth: { clientId: 'public-client-id', clientSecret: '•••• CCCC' },
        timeout: 30
      }
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    for (const s of [ENV_SECRET, HEADER_SECRET, OAUTH_SECRET])
      expect(text).not.toContain(s)

    const row = await mcpQueries.getMcpServerById(id)
    expect(row!.description).toBe('edited')
    expect(row!.env).toEqual({ GITHUB_TOKEN: ENV_SECRET, SHORT: 'abc' })
    expect(row!.headers).toEqual({ Authorization: HEADER_SECRET })
    expect(row!.extraConfig).toEqual({
      oauth: { clientId: 'public-client-id', clientSecret: OAUTH_SECRET },
      timeout: 30
    })
  })

  it('sets a new value, and clears with null', async () => {
    await send('PUT', `/${id}`, {
      headers: { Authorization: 'Bearer brand-new-token-DDDD' },
      env: null
    })
    const row = await mcpQueries.getMcpServerById(id)
    expect(row!.headers).toEqual({
      Authorization: 'Bearer brand-new-token-DDDD'
    })
    expect(row!.env).toBeNull()
  })

  it('leaves fields it was not sent alone', async () => {
    await send('PUT', `/${id}`, { description: 'only this' })
    const row = await mcpQueries.getMcpServerById(id)
    expect(row!.headers).toEqual({ Authorization: HEADER_SECRET })
  })

  it('drops a mask under a name the server never had', async () => {
    await send('PUT', `/${id}`, {
      headers: { Authorization: '•••• BBBB', 'X-Other': '•••• 9999' }
    })
    const row = await mcpQueries.getMcpServerById(id)
    expect(row!.headers).toEqual({ Authorization: HEADER_SECRET })
  })
})

describe('a failed MCP write', () => {
  it('does not echo the secrets it tried to write', async () => {
    const res = await send('PUT', `/${id}`, {
      // jsonb has no \u0000, so Postgres rejects the statement.
      headers: { Authorization: 'Bearer failing-write-FFFF', Bad: 'a\u0000b' }
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await res.text()).not.toContain('failing-write-FFFF')
  })
})

describe('POST /api/v1/mcp', () => {
  it('answers with the new row masked and never stores a mask', async () => {
    const res = await send('POST', '', {
      name: 'other',
      transportType: 'sse',
      url: 'https://other.example.com',
      headers: { Authorization: 'Bearer created-token-EEEE', Stale: '••••' }
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string; headers: unknown }
    expect(body.headers).toEqual({ Authorization: '•••• EEEE' })
    const row = await mcpQueries.getMcpServerById(body.id)
    expect(row!.headers).toEqual({ Authorization: 'Bearer created-token-EEEE' })
  })
})
