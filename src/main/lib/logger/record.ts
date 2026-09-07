import type { Resource } from './resource'

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
      if (error.stack) attrs['exception.stacktrace'] = error.stack
    } else {
      attrs['exception.type'] = 'Error'
      attrs['exception.message'] = String(error)
    }
  }
  return attrs
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
