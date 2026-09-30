// POST /api/v1/logs — the renderer reporting an error it caught.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Hono } from 'hono'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  buildThrowingBundle,
  type BuiltBundle
} from '../../../../helpers/built-bundle'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
const error = vi.fn()
const warn = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { error, warn, info: vi.fn(), debug: vi.fn() }
}))

const { default: logsRouter } = await import('@main/lib/server/routes/logs')
const { resetSourceMapsForTests, setSourceMapRootForTests } =
  await import('@main/lib/logger/source-map')

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

describe('POST /api/v1/logs — stacks from the packaged renderer', () => {
  let built: BuiltBundle
  let url: string

  beforeAll(async () => {
    // Stands in for `.vite/renderer/main_window/assets/index-<hash>.js`.
    built = await buildThrowingBundle('.vite/renderer/main_window/assets')
    url = pathToFileURL(built.file).href
  })
  afterAll(() => built.remove())
  beforeEach(() => setSourceMapRootForTests(join(built.app, '.vite')))
  afterEach(() => resetSourceMapsForTests())

  const stack = () =>
    `TypeError: x is undefined\n    at WeatherCard (${url}:1:91)\n    at div`

  it('maps the stack and the component stack, and keeps what was sent', async () => {
    const componentStack = `\n    at WeatherCard (${url}:1:91)\n    at div`
    const res = await post({
      level: 'error',
      scope: 'tool-card',
      message: 'x is undefined',
      attributes: { toolName: 'weather', stack: stack(), componentStack }
    })
    expect(res.status).toBe(204)
    const [surface, , attributes] = error.mock.calls[0] as [
      string,
      string,
      Record<string, string>
    ]
    expect(surface).toBe('renderer/tool-card')
    expect(attributes.toolName).toBe('weather')
    expect(attributes.stack.split('\n')).toEqual([
      'TypeError: x is undefined',
      expect.stringMatching(
        /^ {4}at WeatherCard \(src\/main\/lib\/boom\.ts:7:\d+\)$/u
      ),
      '    at div'
    ])
    expect(attributes.stack_raw).toBe(stack())
    expect(attributes.componentStack).toMatch(
      /at WeatherCard \(src\/main\/lib\/boom\.ts:7:\d+\)/u
    )
    expect(attributes.componentStack_raw).toBe(componentStack)
  })

  it('adds no second copy when nothing in the stack maps', async () => {
    const dev =
      'Error: boom\n    at Chat (http://localhost:5173/src/renderer/components/chat.tsx:12:3)'
    await post({
      level: 'error',
      scope: 'route',
      message: 'boom',
      attributes: { stack: dev }
    })
    expect(error).toHaveBeenCalledWith('renderer/route', 'boom', {
      stack: dev
    })
  })

  it('leaves an ios report as it was sent', async () => {
    await post({
      level: 'error',
      scope: 'chat',
      message: 'boom',
      source: 'ios',
      attributes: { stack: stack() }
    })
    expect(error).toHaveBeenCalledWith('ios/chat', 'boom', {
      stack: stack()
    })
  })

  it('maps before it clips, so a long stack keeps more of its frames', async () => {
    const frames = Array.from(
      { length: 120 },
      (_, i) => `    at Component${i} (${url}:1:91)`
    )
    const long = ['Error: deep', ...frames].join('\n')
    expect(long.length).toBeGreaterThan(8000)
    await post({
      level: 'error',
      scope: 'tool-card',
      message: 'deep',
      attributes: { componentStack: long }
    })
    const [, , attributes] = error.mock.calls[0] as [
      string,
      string,
      Record<string, string>
    ]
    expect(attributes.componentStack.length).toBeLessThanOrEqual(8000)
    expect(attributes.componentStack_raw.length).toBeLessThanOrEqual(8000)
    const kept = (text: string) => text.match(/at Component\d+ /gu)?.length ?? 0
    expect(kept(attributes.componentStack)).toBe(120)
    expect(kept(attributes.componentStack_raw)).toBeLessThan(120)
  })

  it('does not map past a bound on what it reads', async () => {
    const frame = `    at Component (${url}:1:91)\n`
    const huge = frame.repeat(Math.ceil(200_000 / frame.length))
    const res = await post({
      level: 'error',
      scope: 'tool-card',
      message: 'huge',
      attributes: { stack: huge }
    })
    expect(res.status).toBe(204)
    const [, , attributes] = error.mock.calls[0] as [
      string,
      string,
      Record<string, string>
    ]
    expect(attributes.stack.length).toBeLessThanOrEqual(8000)
    expect(attributes.stack).toMatch(/boom\.ts:7:/u)
  })
})
