import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { LOCAL_USER_ID } from '../../ai/memory/manager'
import {
  createMemory,
  getAllMemories,
  getMemoryById,
  hardDeleteMemory,
  softDeleteMemory,
  updateMemory,
  type MemorySource,
  type MemoryType
} from '../../db/memory-queries'
import {
  deletionSuccessResponse,
  getRequiredParam,
  successResponse,
  updateSuccessResponse
} from '../utils'

const memoryRouter = new Hono<{ Variables: Variables }>()

// GET /api/memory — list all memories (active + inactive)
memoryRouter.get('/', async (c) => {
  const type = c.req.query('type') as MemoryType | undefined
  const rows = await getAllMemories(LOCAL_USER_ID)
  const filtered = type ? rows.filter((m) => m.type === type) : rows
  return successResponse(c, filtered)
})

// GET /api/memory/:id
memoryRouter.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'memory')
  const row = await getMemoryById(id)
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404)
  }
  return successResponse(c, row)
})

// POST /api/memory — create
memoryRouter.post('/', async (c) => {
  const body = await c.req.json<{
    type: MemoryType
    key: string
    value: Record<string, unknown>
    confidence?: number
    source?: MemorySource
  }>()

  if (!body.type || !body.key || !body.value) {
    return c.json({ error: 'type, key, and value are required' }, 400)
  }

  const row = await createMemory({
    userId: LOCAL_USER_ID,
    type: body.type,
    key: body.key,
    value: body.value,
    confidence: body.confidence,
    source: body.source ?? 'system'
  })
  return c.json({ success: true, data: row }, 201)
})

// PATCH /api/memory/:id — update
memoryRouter.patch('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'memory')
  const body = await c.req.json<{
    type?: MemoryType
    key?: string
    value?: Record<string, unknown>
    confidence?: number
    source?: MemorySource
    isActive?: boolean
  }>()

  const updated = await updateMemory(id, body)
  if (!updated) {
    return c.json({ error: 'Memory not found' }, 404)
  }
  return updateSuccessResponse(c, 'memory', id)
})

// DELETE /api/memory/:id — soft delete (sets isActive=false)
memoryRouter.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'memory')
  const hard = c.req.query('hard') === 'true'
  if (hard) {
    await hardDeleteMemory(id)
  } else {
    await softDeleteMemory(id)
  }
  return deletionSuccessResponse(c, 'Memory')
})

export default memoryRouter
