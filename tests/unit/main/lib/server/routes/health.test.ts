import { isAppError } from '@exodus/shared/errors/app-error'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SNAPSHOT, SUMMARY } from '../../../../shared/types/health-fixtures'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}))
vi.mock('@main/lib/logger', () => ({ logger }))

const manager = vi.hoisted(() => ({
  callLlm: vi.fn(),
  loadRelevantMemories: vi.fn(),
  parseJsonFromResponse: (t: string) => {
    try {
      return JSON.parse(t)
    } catch {
      return null
    }
  }
}))
vi.mock('@main/lib/ai/memory/manager', () => manager)

const modelUtil = vi.hoisted(() => ({
  getModelFromProvider: vi.fn(() => ({ model: { id: 'm' }, apiKey: 'k' }))
}))
vi.mock('@main/lib/ai/utils/model-util', () => modelUtil)

const memoryQueries = vi.hoisted(() => ({ createMemory: vi.fn() }))
vi.mock('@main/lib/db/memory-queries', () => memoryQueries)

let settings: Record<string, unknown> = {
  id: 's',
  memory: { useInChat: true }
}

async function buildApp() {
  const { default: healthRouter } =
    await import('@main/lib/server/routes/health')
  const app = new Hono<{ Variables: { settings: unknown } }>()
  app.use('*', async (c, next) => {
    c.set('settings', settings)
    await next()
  })
  app.route('/api/v1/health', healthRouter)
  app.onError((err, c) => {
    if (isAppError(err)) return c.json(err.toJSON(), err.statusCode as never)
    return c.json({ message: err.message }, 500)
  })
  return app
}

const post = async (body: unknown) =>
  (await buildApp()).request('/api/v1/health/summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

beforeEach(() => {
  vi.clearAllMocks()
  settings = { id: 's', memory: { useInChat: true } }
  manager.loadRelevantMemories.mockResolvedValue([
    {
      id: 'm1',
      section: 'profile',
      key: 'half-marathon',
      summary: 'Training for a half marathon',
      details: []
    }
  ])
  manager.callLlm.mockResolvedValue(JSON.stringify(SUMMARY))
})

describe('POST /api/v1/health/summary', () => {
  it('returns the model report and passes the relevant memories in', async () => {
    const res = await post(SNAPSHOT)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(SUMMARY)
    expect(manager.loadRelevantMemories).toHaveBeenCalledWith(
      expect.stringContaining('Daily health report'),
      { id: 'm' },
      'k',
      'health:2026-10-01',
      'health:2026-10-01'
    )
    const userText = manager.callLlm.mock.calls[0][3] as string
    expect(userText).toContain('half-marathon')
    expect(userText).toContain('"steps":5840')
  })

  it('does not read memories when memory is off for chats', async () => {
    settings = { id: 's', memory: { useInChat: false } }
    await post(SNAPSHOT)
    expect(manager.loadRelevantMemories).not.toHaveBeenCalled()
  })

  it('accepts null categories', async () => {
    const res = await post({
      ...SNAPSHOT,
      sleep: null,
      activity: null,
      recovery: null,
      body: null,
      odyState: 'noData'
    })
    expect(res.status).toBe(200)
  })

  it('rejects a snapshot with raw samples', async () => {
    const res = await post({ ...SNAPSHOT, samples: [] })
    expect(res.status).toBe(400)
    expect(manager.callLlm).not.toHaveBeenCalled()
  })

  it('retries once on output that is not the schema, then succeeds', async () => {
    manager.callLlm.mockResolvedValueOnce(
      'Sure! Here is your report: you slept well.'
    )
    const res = await post(SNAPSHOT)
    expect(res.status).toBe(200)
    expect(manager.callLlm).toHaveBeenCalledTimes(2)
  })

  it('fails with AI_GENERATION_FAILED after two bad outputs', async () => {
    manager.callLlm.mockResolvedValue('{"headline": ""}')
    const res = await post(SNAPSHOT)
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe('AI_GENERATION_FAILED')
    expect(manager.callLlm).toHaveBeenCalledTimes(2)
  })

  it('writes nothing and logs no health values', async () => {
    await post(SNAPSHOT)
    expect(memoryQueries.createMemory).not.toHaveBeenCalled()
    const logged = JSON.stringify([
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls
    ])
    for (const value of ['5840', '372', '61', '38'])
      expect(logged).not.toContain(value)
  })
})
