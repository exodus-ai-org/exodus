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
import { ChatSDKError } from '../errors'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  updateSuccessResponse
} from '../utils'

const memoryRouter = new Hono<{ Variables: Variables }>()

// GET /api/memory — list all memories (active + inactive)
memoryRouter.get('/', async (c) => {
  const type = c.req.query('type') as MemoryType | undefined
  const rows = await handleDatabaseOperation(
    () => getAllMemories(LOCAL_USER_ID),
    'Failed to load memories'
  )
  const filtered = type ? rows.filter((m) => m.type === type) : rows
  return successResponse(c, filtered)
})

// GET /api/memory/:id
memoryRouter.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'memory')
  const row = await handleDatabaseOperation(
    () => getMemoryById(id),
    'Failed to load memory'
  )
  if (!row) {
    throw new ChatSDKError('not_found:memory', `Memory ${id} not found`)
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
    throw new ChatSDKError(
      'bad_request:memory',
      'type, key, and value are required'
    )
  }

  const row = await handleDatabaseOperation(
    () =>
      createMemory({
        userId: LOCAL_USER_ID,
        type: body.type,
        key: body.key,
        value: body.value,
        confidence: body.confidence,
        source: body.source ?? 'system'
      }),
    'Failed to create memory'
  )
  return successResponse(c, row, 201)
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

  const updated = await handleDatabaseOperation(
    () => updateMemory(id, body),
    'Failed to update memory'
  )
  if (!updated) {
    throw new ChatSDKError('not_found:memory', `Memory ${id} not found`)
  }
  return updateSuccessResponse(c, 'memory', id)
})

// DELETE /api/memory/:id — soft delete (sets isActive=false)
memoryRouter.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'memory')
  const hard = c.req.query('hard') === 'true'
  await handleDatabaseOperation(
    () => (hard ? hardDeleteMemory(id) : softDeleteMemory(id)),
    'Failed to delete memory'
  )
  return deletionSuccessResponse(c, 'Memory')
})

export default memoryRouter
