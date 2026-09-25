// src/main/lib/server/routes/project.ts — DELETE /:id also deletes every
// chat of the project, so their generated media goes with them.
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/project-queries', () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(async () => {}),
  getAllProjects: vi.fn(),
  getProjectWithCounts: vi.fn(),
  updateProject: vi.fn()
}))
vi.mock('@main/lib/db/queries', () => ({
  getAllChats: vi.fn(async () => [{ id: 'c1' }, { id: 'c2' }])
}))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))
vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: vi.fn(() => ({ elasticsearch: null, pglite: {} }))
}))
const removeChatMedia = vi.fn(async () => {})
vi.mock('@main/lib/media/store', () => ({ removeChatMedia }))

const { default: projectRouter } =
  await import('@main/lib/server/routes/project')
const { deleteProject } = await import('@main/lib/db/project-queries')

describe('DELETE /api/v1/project/:id', () => {
  it('removes the media of every chat the project deleted', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('settings' as never, {} as never)
      await next()
    })
    app.route('/', projectRouter)

    const res = await app.request('/p1', { method: 'DELETE' })

    expect(res.status).toBe(200)
    expect(vi.mocked(deleteProject)).toHaveBeenCalledWith({ id: 'p1' })
    expect(removeChatMedia.mock.calls).toEqual([['c1'], ['c2']])
  })
})
