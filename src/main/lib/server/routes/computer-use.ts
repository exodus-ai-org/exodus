import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { computerAskRegistry } from '../../computer/ask-registry'
import { liveness } from '../../computer/liveness'
import { successResponse } from '../utils'

const router = new Hono<{ Variables: Variables }>()

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
