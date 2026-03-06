import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { updateSetting } from '../../db/queries'
import { updateSettingsSchema } from '../schemas/setting'
import {
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const setting = new Hono<{ Variables: Variables }>()

setting.get('/', async (c) => {
  const setting = c.get('setting')
  return successResponse(c, setting)
})

setting.post('/', async (c) => {
  const payload = validateSchema(
    updateSettingsSchema,
    await c.req.json(),
    'setting',
    'Invalid setting configuration'
  )

  const updatedSetting = await handleDatabaseOperation(
    () => updateSetting(payload),
    'Failed to update setting'
  )

  return successResponse(c, updatedSetting)
})

export default setting
