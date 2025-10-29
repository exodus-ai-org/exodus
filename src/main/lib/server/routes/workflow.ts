import { Hono } from 'hono'
import { Variables } from 'hono/types'

const workflow = new Hono<{ Variables: Variables }>()

workflow.post('/', async (c) => {
  return c.json({})
})

export default workflow
