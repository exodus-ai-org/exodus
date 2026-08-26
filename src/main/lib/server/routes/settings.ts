import { ErrorCode } from '@shared/constants/error-codes'
import { ValidationError } from '@shared/errors/app-error'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getAllSearchableMessages, updateSettings } from '../../db/queries'
import { Settings as DBSettings } from '../../db/schema'
import { applyProxy } from '../../proxy'
import { resolveSearchProvider } from '../../search/resolve-search-provider'
import { updateSettingsSchema } from '../schemas/settings'
import {
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const settingsRouter = new Hono<{ Variables: Variables }>()

settingsRouter.get('/', async (c) => {
  const settings = c.get('settings')
  return successResponse(c, settings)
})

settingsRouter.post('/', async (c) => {
  const payload = validateSchema(
    updateSettingsSchema,
    await c.req.json(),
    'Invalid setting configuration'
  )

  const updatedSettings = await handleDatabaseOperation(
    () => updateSettings(payload as unknown as DBSettings),
    'Failed to update settings'
  )

  // Apply proxy change immediately
  const settings = payload as unknown as DBSettings
  applyProxy(settings.proxy)

  return successResponse(c, updatedSettings)
})

settingsRouter.post('/search/test-connection', async (c) => {
  const settings = c.get('settings')
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'Elasticsearch is not configured'
    )
  }

  try {
    // A no-op search doubles as a connectivity check without requiring a
    // separate client handle — any hits array (even empty) means the
    // cluster answered.
    await elasticsearch.search('')
    return successResponse(c, { ok: true })
  } catch (error) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      error instanceof Error
        ? `Failed to connect to Elasticsearch: ${error.message}`
        : 'Failed to connect to Elasticsearch'
    )
  }
})

settingsRouter.post('/search/reindex', async (c) => {
  const settings = c.get('settings')
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'Elasticsearch is not configured'
    )
  }

  const rows = await handleDatabaseOperation(
    () => getAllSearchableMessages(),
    'Failed to load messages for reindexing'
  )

  for (const row of rows) {
    await elasticsearch.indexMessage(row)
  }

  return successResponse(c, { count: rows.length })
})

export default settingsRouter
