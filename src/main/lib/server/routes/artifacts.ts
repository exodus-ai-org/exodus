import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getArtifact, listArtifacts } from '../../ai/artifacts'
import { updateArtifactCodeByArtifactId } from '../../db/queries'
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

// Re-sync a hand-edited .tsx file on disk back into the DB row the card
// actually renders from. Useful after manually fixing an artifact (e.g.
// converting hardcoded colors to theme tokens) without regenerating it.
artifactsRouter.post('/:chatId/:artifactId/resync', async (c) => {
  const chatId = c.req.param('chatId')
  const artifactId = c.req.param('artifactId')
  const onDisk = getArtifact(chatId, artifactId)
  if (!onDisk) return c.json({ error: 'Artifact file not found' }, 404)
  const updated = await updateArtifactCodeByArtifactId({
    artifactId,
    code: onDisk.code
  })
  if (updated === 0) {
    return c.json({ error: 'No matching artifact message in DB' }, 404)
  }
  return successResponse(c, { updated, bytes: onDisk.code.length })
})

export default artifactsRouter
