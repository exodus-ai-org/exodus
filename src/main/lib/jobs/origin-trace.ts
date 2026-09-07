import { currentTrace } from '../logger/trace-context'

/**
 * A job runs later, outside the trace of whatever enqueued it. To keep the two
 * linkable, `enqueueJob` stamps the ambient `traceId` onto the payload as this
 * sibling field and the worker starts the job's trace with it as
 * `originTraceId`. Handlers read named fields off `payload as SomeType`, so the
 * extra key is invisible to them.
 */
const ORIGIN_TRACE_KEY = '__originTraceId'

export function applyOriginTraceId(payload: unknown): unknown {
  const traceId = currentTrace()?.traceId
  if (!traceId || payload === null || typeof payload !== 'object')
    return payload
  return {
    ...(payload as Record<string, unknown>),
    [ORIGIN_TRACE_KEY]: traceId
  }
}

export function extractOriginTraceId(payload: unknown): string | undefined {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    ORIGIN_TRACE_KEY in payload
  ) {
    return String((payload as Record<string, unknown>)[ORIGIN_TRACE_KEY])
  }
  return undefined
}
