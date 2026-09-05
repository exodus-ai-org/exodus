import { currentTrace } from '@main/lib/logger/trace-context'
import { traceMiddleware } from '@main/lib/server/middlewares/trace'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

describe('traceMiddleware', () => {
  it('runs the handler inside a trace and sets x-trace-id', async () => {
    const app = new Hono()
    app.use('*', traceMiddleware)
    let seen: string | undefined
    app.get('/x', (c) => {
      seen = currentTrace()?.traceId
      return c.text('ok')
    })
    const res = await app.request('/x')
    expect(res.status).toBe(200)
    expect(seen).toMatch(/^[0-9a-f]{32}$/)
    expect(res.headers.get('x-trace-id')).toBe(seen)
  })

  it('gives distinct ids to distinct requests', async () => {
    const app = new Hono()
    app.use('*', traceMiddleware)
    app.get('/x', (c) => c.text(currentTrace()!.traceId))
    const a = await (await app.request('/x')).text()
    const b = await (await app.request('/x')).text()
    expect(a).not.toBe(b)
  })
})
