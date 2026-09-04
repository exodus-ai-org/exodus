import { ErrorCode } from '@shared/constants/error-codes'
import { NotFoundError, ValidationError } from '@shared/errors/app-error'
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
  type MemorySection,
  type MemorySource
} from '../../db/memory-queries'
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
  const section = c.req.query('section') as MemorySection | undefined
  const rows = await handleDatabaseOperation(
    () => getAllMemories(LOCAL_USER_ID),
    'Failed to load memories'
  )
  const filtered = section ? rows.filter((m) => m.section === section) : rows
  return successResponse(c, filtered)
})

// GET /api/memory/:id
memoryRouter.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const row = await handleDatabaseOperation(
    () => getMemoryById(id),
    'Failed to load memory'
  )
  if (!row) {
    throw new NotFoundError(
      ErrorCode.MEMORY_NOT_FOUND,
      `Memory ${id} not found`
    )
  }
  return successResponse(c, row)
})

// POST /api/memory — create
memoryRouter.post('/', async (c) => {
  const body = await c.req.json<{
    section: MemorySection
    key: string
    summary: string
    details?: string[]
    confidence?: number
    source?: MemorySource
  }>()

  if (!body.section || !body.key || !body.summary) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'section, key, and summary are required'
    )
  }

  const row = await handleDatabaseOperation(
    () =>
      createMemory({
        userId: LOCAL_USER_ID,
        section: body.section,
        key: body.key,
        summary: body.summary,
        details: body.details,
        confidence: body.confidence,
        source: body.source ?? 'system'
      }),
    'Failed to create memory'
  )
  return successResponse(c, row, 201)
})

// PATCH /api/memory/:id — update
memoryRouter.patch('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const body = await c.req.json<{
    section?: MemorySection
    key?: string
    summary?: string
    details?: string[]
    confidence?: number
    source?: MemorySource
    isActive?: boolean
  }>()

  const updated = await handleDatabaseOperation(
    () => updateMemory(id, body),
    'Failed to update memory'
  )
  if (!updated) {
    throw new NotFoundError(
      ErrorCode.MEMORY_NOT_FOUND,
      `Memory ${id} not found`
    )
  }
  return updateSuccessResponse(c, 'memory', id)
})

// DELETE /api/memory/:id — soft delete (sets isActive=false)
memoryRouter.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const hard = c.req.query('hard') === 'true'
  await handleDatabaseOperation(
    () => (hard ? hardDeleteMemory(id) : softDeleteMemory(id)),
    'Failed to delete memory'
  )
  return deletionSuccessResponse(c, 'Memory')
})

export default memoryRouter
