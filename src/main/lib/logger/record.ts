import type { Resource } from './resource'
import { mapStackTrace } from './source-map'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogRecord {
  timestamp: string
  severityNumber: number
  severityText: string
  body: string
  scope: { name: string }
  attributes: Record<string, unknown>
  resource: Resource
  traceId?: string
  originTraceId?: string
  spanId?: string // reserved — never populated this iteration
}

const SEVERITY: Record<
  LogLevel,
  { severityNumber: number; severityText: string }
> = {
  debug: { severityNumber: 5, severityText: 'DEBUG' },
  info: { severityNumber: 9, severityText: 'INFO' },
  warn: { severityNumber: 13, severityText: 'WARN' },
  error: { severityNumber: 17, severityText: 'ERROR' }
}

export const MIN_SEVERITY_DEV = SEVERITY.debug.severityNumber
export const MIN_SEVERITY_PROD = SEVERITY.info.severityNumber

export function severityOf(level: LogLevel) {
  return SEVERITY[level]
}

const LEGACY_LEVELS = new Set<string>(['debug', 'info', 'warn', 'error'])

/**
 * A log call's detail as the record's attributes. Whatever is caught goes
 * under `error`, as it was caught — the Error itself, never `String(err)` or
 * `err.message`, which is where a stack is lost:
 *
 * - `exception.type` / `exception.message` — its name and message;
 * - `exception.stacktrace` — its stack, with the frames that point into a
 *   built file rewritten to the source line they came from (`source-map.ts`);
 * - `exception.stacktrace_raw` — the stack as it was thrown, only when the
 *   line above differs from it.
 *
 * Anything that is not an Error has no stack to record: it becomes
 * `exception.message` through `String()`.
 */
export function toAttributes(
  detail?: Record<string, unknown> | null
): Record<string, unknown> {
  if (detail == null) return {}
  const { error, ...rest } = detail
  const attrs: Record<string, unknown> = { ...rest }
  if (error !== undefined) {
    if (error instanceof Error) {
      attrs['exception.type'] = error.name || 'Error'
      attrs['exception.message'] = error.message
      if (error.stack) {
        const mapped = mapStackTrace(error.stack)
        attrs['exception.stacktrace'] = mapped
        if (mapped !== error.stack) {
          attrs['exception.stacktrace_raw'] = error.stack
        }
      }
    } else {
      attrs['exception.type'] = 'Error'
      attrs['exception.message'] = String(error)
    }
  }
  return attrs
}

// A V8 frame: `at name (location:line:column)`, `at location:line:column`,
// or one with no position — `at div (<anonymous>)`, `at Promise.all (index 0)`.
const FRAME_LINE = /^\s+at .*(?::\d+:\d+\)?|\))$/u

/**
 * Only the frames of what was caught — no name, no message — mapped like any
 * other stack. For a site that logs an error's name alone because its message
 * can quote what must not be written (drizzle puts a failed statement's
 * parameters in it: whole conversations, keys): where it was thrown holds
 * function names and code positions and nothing else. Logged as
 * `'exception.stacktrace': stackFramesOf(error)`, beside the name.
 */
export function stackFramesOf(error: unknown): string | undefined {
  if (!(error instanceof Error) || typeof error.stack !== 'string') {
    return undefined
  }
  const { message } = error
  const stack = error.stack.trimEnd()
  // The stack opens with `name: message`. Past the message there are only
  // frames; when the message is not in it (replaced since), only the run of
  // frame-shaped lines the stack ends with is taken.
  const at = message ? stack.indexOf(message) : -1
  const lines = (at < 0 ? stack : stack.slice(at + message.length)).split('\n')
  let first = lines.length
  while (first > 0 && FRAME_LINE.test(lines[first - 1])) first--
  if (first === lines.length) return undefined
  return mapStackTrace(lines.slice(first).join('\n'))
}

function isRecordObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/**
 * Accepts a parsed JSONL line in either the current `LogRecord` shape or the
 * pre-standardization `{ ts, level, surface, message, detail }` shape. Returns
 * `null` for anything else so the reader can skip malformed lines.
 */
export function normalizeToLogRecord(raw: unknown): LogRecord | null {
  if (!isRecordObject(raw)) return null

  // New shape — trust the required fields.
  if (
    typeof raw.timestamp === 'string' &&
    typeof raw.severityNumber === 'number' &&
    typeof raw.body === 'string' &&
    isRecordObject(raw.scope)
  ) {
    return raw as unknown as LogRecord
  }

  // Legacy shape.
  if (
    typeof raw.ts === 'string' &&
    typeof raw.level === 'string' &&
    LEGACY_LEVELS.has(raw.level) &&
    typeof raw.surface === 'string' &&
    typeof raw.message === 'string'
  ) {
    const sev = SEVERITY[raw.level as LogLevel]
    return {
      timestamp: raw.ts,
      severityNumber: sev.severityNumber,
      severityText: sev.severityText,
      body: raw.message,
      scope: { name: raw.surface },
      attributes: isRecordObject(raw.detail) ? raw.detail : {},
      resource: {} as Resource
    }
  }

  return null
}
