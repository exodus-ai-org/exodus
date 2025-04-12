import { Variables } from '@shared/types/ai'
import { Hono } from 'hono'
import { getChats } from '../../db/queries'

const history = new Hono<{ Variables: Variables }>()

history.get('/', async (c) => {
  const chats = await getChats()
  return c.json(chats)
})

export default history
