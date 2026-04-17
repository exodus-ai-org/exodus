import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { updateSettings } from '../../db/queries'
import { Settings as DBSettings } from '../../db/schema'
import { applyProxy } from '../../proxy'
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
  await applyProxy(settings.proxy)

  return successResponse(c, updatedSettings)
})

export default settingsRouter
