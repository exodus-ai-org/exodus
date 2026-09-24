// src/main/lib/server/routes/memory.ts
import { isAppError } from '@exodus/shared/errors/app-error'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const manager = vi.hoisted(() => ({
  LOCAL_USER_ID: '00000000-0000-0000-0000-000000000001',
  runMemoryInstruction: vi.fn()
}))
vi.mock('@main/lib/ai/memory/manager', () => manager)

vi.mock('@main/lib/ai/utils/model-util', () => ({
  getModelFromProvider: vi.fn()
}))

const queries = vi.hoisted(() => ({
  createMemory: vi.fn(),
  getAllMemories: vi.fn(),
  getMemoryById: vi.fn(),
  hardDeleteMemory: vi.fn(),
  softDeleteMemory: vi.fn(),
  updateMemory: vi.fn()
}))
vi.mock('@main/lib/db/memory-queries', () => queries)

const undo = vi.hoisted(() => ({ undoMemoryChanges: vi.fn() }))
vi.mock('@main/lib/ai/memory/undo', () => undo)

async function buildApp() {
  const { default: memoryRouter } =
    await import('@main/lib/server/routes/memory')
  const app = new Hono()
  app.route('/api/v1/memory', memoryRouter)
  app.onError((err, c) => {
    if (isAppError(err)) return c.json(err.toJSON(), err.statusCode as never)
    return c.json({ message: err.message }, 500)
  })
  return app
}

describe('POST /api/v1/memory/undo', () => {
  beforeEach(() => {
    undo.undoMemoryChanges.mockReset()
  })

  it('400s when the body has no changes array', async () => {
    const app = await buildApp()
    const res = await app.request('/api/v1/memory/undo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(400)
    expect(undo.undoMemoryChanges).not.toHaveBeenCalled()
  })

  it('returns { undone, skipped } for a valid body', async () => {
    undo.undoMemoryChanges.mockResolvedValue({ undone: ['a'], skipped: ['b'] })
    const app = await buildApp()
    const change = {
      op: 'update',
      id: 'a',
      before: {
        section: 'profile',
        key: 'k',
        summary: 's',
        details: [],
        isActive: true
      },
      after: {
        section: 'profile',
        key: 'k',
        summary: 's2',
        details: [],
        isActive: true
      }
    }

    const res = await app.request('/api/v1/memory/undo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ changes: [change] })
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ undone: ['a'], skipped: ['b'] })
    expect(undo.undoMemoryChanges).toHaveBeenCalledWith([change])
  })
})
