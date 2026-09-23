import { Hono } from 'hono'
import { z } from 'zod'

import { pairing, syncLan } from '../../lan'
import { registerDevice } from '../../lan/devices'
import { logger } from '../../logger'
import type { Variables } from '../types'
import { successResponse, validateSchema } from '../utils'

const pairSchema = z.object({
  code: z.string().min(1).max(64),
  deviceName: z.string().trim().min(1).max(64)
})

const pairRouter = new Hono<{ Variables: Variables }>()

/**
 * The one request a device makes without a token: it trades the one-time code
 * from the QR code for one. Guarded by the pairing window (see lan/pairing.ts)
 * rather than by authGate.
 */
pairRouter.post('/', async (c) => {
  // No window, no endpoint — indistinguishable from an unknown route.
  if (!pairing.current()) return c.notFound()
  // Validated before the code is tried: a malformed request costs no attempt.
  const { code, deviceName } = validateSchema(
    pairSchema,
    await c.req.json(),
    'Invalid request body'
  )

  const result = pairing.verify(code)
  if (result === 'closed') return c.notFound()
  if (result === 'wrong') {
    return c.json(
      {
        type: 'error',
        error: {
          code: 'PAIRING_CODE_INVALID',
          message: 'That pairing code is not valid.'
        }
      },
      403
    )
  }

  const device = await registerDevice(deviceName)
  logger.info('lan', 'Device paired', { deviceId: device.deviceId, deviceName })
  await syncLan()
  return successResponse(c, device)
})

export default pairRouter
