import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getAllChats } from '../../db/queries'

const history = new Hono<{ Variables: Variables }>()

history.get('/', async (c) => {
  const chats = await getAllChats()
  return c.json(chats)
})

export default history
