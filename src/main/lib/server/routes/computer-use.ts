import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { computerAskRegistry } from '../../computer/ask-registry'
import { getHelper } from '../../computer/helper'
import { liveness } from '../../computer/liveness'
import type { InstalledApp } from '../../computer/types'
import { successResponse } from '../utils'

const router = new Hono<{ Variables: Variables }>()

// `list-apps` scans the app directories and renders every icon — cache it so
// re-opening the Settings picker doesn't re-run the scan each time.
const APPS_TTL_MS = 60_000
let appsCache: { at: number; apps: InstalledApp[] } | null = null

// GET /api/computer-use/apps — installed applications for the allowlist picker.
router.get('/apps', async (c) => {
  if (!appsCache || Date.now() - appsCache.at > APPS_TTL_MS) {
    appsCache = { at: Date.now(), apps: await getHelper().listApps() }
  }
  return successResponse(c, { apps: appsCache.apps })
})

// POST /api/computer-use/abort — the Stop button. Aborts every live session
// (same effect as the global ⌥⇧⎋ hotkey, with reason 'user').
router.post('/abort', (c) => {
  liveness.abortAll('user')
  return successResponse(c, { ok: true })
})

// POST /api/computer-use/answer — { sessionId, answer }. Unblocks a session
// parked on an `askHuman` action. Permissive for V0: a missing/blank sessionId
// (or no pending question) is a silent no-op, still { ok: true }.
router.post('/answer', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    sessionId?: unknown
    answer?: unknown
  }
  const sessionId =
    typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  if (sessionId) {
    computerAskRegistry.resolve(sessionId, String(body.answer ?? ''))
  }
  return successResponse(c, { ok: true })
})

export default router
