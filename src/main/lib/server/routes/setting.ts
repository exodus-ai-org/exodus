import { Variables } from '@shared/types/ai'
import { Hono } from 'hono'
import { getSetting, updateSetting } from '../../db/queries'

const setting = new Hono<{ Variables: Variables }>()

setting.get('/', async (c) => {
  const setting = await getSetting()
  return c.json(setting)
})

setting.post('/', async (c) => {
  const payload = await c.req.json()
  const setting = await updateSetting(payload)
  return c.json(setting)
})

export default setting
