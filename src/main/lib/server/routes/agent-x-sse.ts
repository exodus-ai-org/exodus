import type { AgentXSseEvent } from '@shared/types/agent-x'
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getRequiredParam } from '../utils'
import { SSE_HEADERS, SseManager } from '../utils/sse-manager'

export const sseManager = new SseManager<string>()

// emitToTask notifies both task-specific clients AND global clients
export function emitToTask(taskId: string, event: AgentXSseEvent): void {
  // Encode once, send to both topic and global clients
  const payload = sseManager.encodeEvent(event)
  sseManager.emitRaw(taskId, payload)
  sseManager.emitGlobalRaw(payload)
}

export function emitToAll(event: AgentXSseEvent): void {
  sseManager.emitGlobal(event)
}

const agentXSse = new Hono<{ Variables: Variables }>()

agentXSse.get('/tasks/:id/sse', (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')

  const stream = new ReadableStream({
    start(controller) {
      sseManager.register(id, controller, c.req.raw.signal)
    }
  })

  return new Response(stream, { headers: SSE_HEADERS })
})

agentXSse.get('/sse', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      sseManager.registerGlobal(controller, c.req.raw.signal)
    }
  })

  return new Response(stream, { headers: SSE_HEADERS })
})

export default agentXSse
