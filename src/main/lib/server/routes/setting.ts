import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getSettings, updateSetting } from '../../db/queries'
import { updateSettingsSchema } from '../schemas'

const setting = new Hono<{ Variables: Variables }>()

setting.get('/', async (c) => {
  const setting = await getSettings()
  return c.json(setting)
})

setting.post('/', async (c) => {
  const result = updateSettingsSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.text('Invalid request body', 400)
  }
  const payload = result.data
  const setting = await updateSetting(payload)
  return c.json(setting)
})

export default setting
