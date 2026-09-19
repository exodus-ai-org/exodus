import { Hono } from 'hono'

import { getAllChats } from '../../db/queries'
import { Variables } from '../types'
import { handleDatabaseOperation, successResponse } from '../utils'

const history = new Hono<{ Variables: Variables }>()

history.get('/', async (c) => {
  const projectId = c.req.query('projectId')
  const chats = await handleDatabaseOperation(
    () => getAllChats(projectId),
    'Failed to get chat history'
  )
  return successResponse(c, chats)
})

export default history
