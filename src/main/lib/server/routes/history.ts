import { Hono } from 'hono'
import { getChats } from '../../db/queries'
import { Variables } from '../types'

const history = new Hono<{ Variables: Variables }>()

history.get('/', async (c) => {
  const chats = await getChats()
  return c.json(chats)
})

export default history
