import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getArtifact, listArtifacts } from '../../ai/artifacts'
import { successResponse } from '../utils'

const artifactsRouter = new Hono<{ Variables: Variables }>()

artifactsRouter.get('/:chatId', async (c) => {
  const chatId = c.req.param('chatId')
  return successResponse(c, listArtifacts(chatId))
})

artifactsRouter.get('/:chatId/:artifactId', async (c) => {
  const chatId = c.req.param('chatId')
  const artifactId = c.req.param('artifactId')
  const result = getArtifact(chatId, artifactId)
  if (!result) return c.json({ error: 'Artifact not found' }, 404)
  return successResponse(c, result)
})

export default artifactsRouter
