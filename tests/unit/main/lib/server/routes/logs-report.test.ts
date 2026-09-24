// POST /api/v1/logs — the renderer reporting an error it caught.
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
const error = vi.fn()
const warn = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { error, warn, info: vi.fn(), debug: vi.fn() }
}))

const { default: logsRouter } = await import('@main/lib/server/routes/logs')

function post(body: unknown) {
  const app = new Hono()
  app.route('/api/v1/logs', logsRouter)
  return app.request('/api/v1/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/v1/logs', () => {
  it('writes an error the renderer caught, under a renderer surface', async () => {
    const res = await post({
      level: 'error',
      scope: 'tool-card',
      message: "Cannot read properties of undefined (reading 'weatherCode')",
      attributes: { toolName: 'weather', stack: 'at WeatherCard' }
    })
    expect(res.status).toBe(204)
    expect(error).toHaveBeenCalledWith(
      'renderer/tool-card',
      "Cannot read properties of undefined (reading 'weatherCode')",
      { toolName: 'weather', stack: 'at WeatherCard' }
    )
  })

  it('writes a warning at the warn level', async () => {
    await post({ level: 'warn', scope: 'route', message: 'slow' })
    expect(warn).toHaveBeenCalledWith('renderer/route', 'slow', undefined)
  })

  it('refuses a malformed report', async () => {
    expect(
      (await post({ level: 'debug', scope: 'x', message: 'y' })).status
    ).toBe(400)
    expect((await post({ level: 'error', scope: 'x' })).status).toBe(400)
    expect(
      (await post({ level: 'error', scope: '', message: 'y' })).status
    ).toBe(400)
    expect(error).not.toHaveBeenCalled()
  })

  it('caps what one report may carry', async () => {
    const res = await post({
      level: 'error',
      scope: 'tool-card',
      message: 'x'.repeat(5000),
      attributes: { stack: 'y'.repeat(20_000) }
    })
    expect(res.status).toBe(204)
    const [, message, attributes] = error.mock.calls[0] as [
      string,
      string,
      { stack: string }
    ]
    expect(message.length).toBeLessThanOrEqual(2000)
    expect(attributes.stack.length).toBeLessThanOrEqual(8000)
  })

  it('defaults an unspecified source to renderer', async () => {
    const res = await post({ level: 'error', scope: 'x', message: 'boom' })
    expect(res.status).toBe(204)
    expect(error).toHaveBeenCalledWith('renderer/x', 'boom', undefined)
  })

  it('writes an ios report under an ios surface', async () => {
    const res = await post({
      level: 'error',
      scope: 'x',
      message: 'boom',
      source: 'ios'
    })
    expect(res.status).toBe(204)
    expect(error).toHaveBeenCalledWith('ios/x', 'boom', undefined)
  })

  it('refuses an unknown source', async () => {
    const res = await post({
      level: 'error',
      scope: 'x',
      message: 'boom',
      source: 'android'
    })
    expect(res.status).toBe(400)
    expect(error).not.toHaveBeenCalled()
  })

  it('logs a batch of reports in order', async () => {
    const res = await post({
      reports: [
        { level: 'error', scope: 'a', message: 'one', source: 'ios' },
        { level: 'warn', scope: 'b', message: 'two' },
        { level: 'error', scope: 'c', message: 'three', source: 'ios' }
      ]
    })
    expect(res.status).toBe(204)
    expect(error).toHaveBeenNthCalledWith(1, 'ios/a', 'one', undefined)
    expect(warn).toHaveBeenNthCalledWith(1, 'renderer/b', 'two', undefined)
    expect(error).toHaveBeenNthCalledWith(2, 'ios/c', 'three', undefined)
  })

  it('refuses a batch over the 50-report cap', async () => {
    const reports = Array.from({ length: 51 }, (_, i) => ({
      level: 'error' as const,
      scope: 'x',
      message: `${i}`
    }))
    const res = await post({ reports })
    expect(res.status).toBe(400)
    expect(error).not.toHaveBeenCalled()
  })

  it('clips each report in a batch independently', async () => {
    const res = await post({
      reports: [
        {
          level: 'error',
          scope: 'x',
          message: 'a'.repeat(5000),
          attributes: { stack: 'b'.repeat(20_000) }
        }
      ]
    })
    expect(res.status).toBe(204)
    const [, message, attributes] = error.mock.calls[0] as [
      string,
      string,
      { stack: string }
    ]
    expect(message.length).toBeLessThanOrEqual(2000)
    expect(attributes.stack.length).toBeLessThanOrEqual(8000)
  })
})
