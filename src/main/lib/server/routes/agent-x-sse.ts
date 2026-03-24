import type { AgentXSseEvent } from '@shared/types/agent-x'
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getRequiredParam } from '../utils'
import { SseManager } from '../utils/sse-manager'

export const sseManager = new SseManager<string>()

// emitToTask notifies both task-specific clients AND global clients
export function emitToTask(taskId: string, event: AgentXSseEvent): void {
  sseManager.emit(taskId, event as unknown as { type: string; data: unknown })
  sseManager.emitGlobal(event as unknown as { type: string; data: unknown })
}

export function emitToAll(event: AgentXSseEvent): void {
  sseManager.emitGlobal(event as unknown as { type: string; data: unknown })
}

const agentXSse = new Hono<{ Variables: Variables }>()

// SSE for a single task
agentXSse.get('/tasks/:id/sse', (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')

  const stream = new ReadableStream({
    start(controller) {
      sseManager.register(id, controller, c.req.raw.signal)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

// SSE for all active tasks
agentXSse.get('/sse', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      sseManager.registerGlobal(controller, c.req.raw.signal)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

export default agentXSse
