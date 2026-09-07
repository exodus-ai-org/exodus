import type { Context, Next } from 'hono'

import { currentTrace, withTrace } from '../../logger/trace-context'

/**
 * Wraps every `/api/*` request in a trace so any `logger.*` call made while
 * handling it — however deep in `agentLoop`, tools, the DB layer, or a
 * synchronous job kick — carries the same `traceId`. The id is echoed as the
 * `x-trace-id` response header for renderer-side correlation.
 */
export async function traceMiddleware(c: Context, next: Next): Promise<void> {
  await withTrace(async () => {
    const id = currentTrace()?.traceId
    if (id) c.header('x-trace-id', id)
    await next()
  })
}
