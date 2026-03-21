import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getAllChats } from '../../db/queries'
import { handleDatabaseOperation, successResponse } from '../utils'

const history = new Hono<{ Variables: Variables }>()

history.get('/', async (c) => {
  const chats = await handleDatabaseOperation(
    () => getAllChats(),
    'Failed to get chat history'
  )
  return successResponse(c, chats)
})

export default history
