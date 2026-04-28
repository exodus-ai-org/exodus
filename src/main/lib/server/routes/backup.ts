import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { createAutoBackup, listAutoBackups } from '../../backup'
import { getSettings } from '../../db/queries'
import { successResponse } from '../utils'

const backupRouter = new Hono<{ Variables: Variables }>()

backupRouter.get('/list', async (c) => {
  const backups = listAutoBackups()
  return successResponse(c, backups)
})

backupRouter.get('/status', async (c) => {
  const s = await getSettings()
  return successResponse(c, {
    autoBackup: s.autoBackup ?? true,
    lastBackupAt: s.lastBackupAt?.toISOString() ?? null
  })
})

backupRouter.post('/now', async (c) => {
  const filePath = await createAutoBackup()
  return successResponse(c, { filePath })
})

export default backupRouter
