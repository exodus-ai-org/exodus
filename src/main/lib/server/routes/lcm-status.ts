import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { lcmStatusBus } from '../../ai/context-management/lcm-status-bus'
import { logger } from '../../logger'
import { SSE_HEADERS } from '../utils/sse-manager'

const lcmStatus = new Hono<{ Variables: Variables }>()

lcmStatus.get('/:chatId/status', (c) => {
  const chatId = c.req.param('chatId')
  if (!chatId) return c.text('chatId required', 400)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch (err) {
          logger.warn('lcm', 'Failed to enqueue SSE frame', {
            chatId,
            error: String(err)
          })
        }
      }

      // Sync initial state for late subscribers / reconnects.
      send({ type: 'init', state: lcmStatusBus.getCurrentState(chatId) })

      const unsubscribe = lcmStatusBus.subscribe(chatId, send)

      const signal = c.req.raw.signal
      const onAbort = () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })

  return new Response(stream, { headers: SSE_HEADERS })
})

export default lcmStatus
