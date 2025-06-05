import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getSettings, updateSetting } from '../../db/queries'
import { updateSettingsSchema } from '../schemas'

const settings = new Hono<{ Variables: Variables }>()

settings.get('/', async (c) => {
  const settings = await getSettings()
  return c.json(settings)
})

settings.post('/', async (c) => {
  const result = updateSettingsSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.text('Invalid request body', 400)
  }
  const payload = result.data
  const settings = await updateSetting(payload)
  return c.json(settings)
})

export default settings
