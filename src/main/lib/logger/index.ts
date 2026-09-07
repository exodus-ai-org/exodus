import { readdirSync, unlinkSync } from 'fs'
import { appendFile } from 'fs/promises'
import { join } from 'path'

import { is } from '@electron-toolkit/utils'

import { getLogsDir } from '../paths'
import {
  type LogLevel,
  type LogRecord,
  MIN_SEVERITY_DEV,
  MIN_SEVERITY_PROD,
  normalizeToLogRecord,
  severityOf,
  toAttributes
} from './record'
import { getResource } from './resource'
import { currentTrace } from './trace-context'

export type { LogLevel, LogRecord }
export { normalizeToLogRecord }

type KnownLogSurface =
  | 'app'
  | 'server'
  | 'migration'
  | 'chat'
  | 'database'
  | 'agent_x'
  | 'philharmonic'
  | 'mcp'
  | 'audio'
  | 'memory'
  | 'deep_research'
  | 'scheduler'
  | 's3'
  | 'skills'
  | 'lcm'
  | 'tools'
  | 'search'
  | 'jobs'
  | 'knowledge-base'
  | 'discover'
  | 'computer'

// Open union: known surfaces keep editor autocomplete, any string still
// type-checks — new subsystems no longer have to edit this list.
export type LogSurface = KnownLogSurface | (string & {})

const MIN_SEVERITY = is.dev ? MIN_SEVERITY_DEV : MIN_SEVERITY_PROD
const RETENTION_DAYS = 7

// Use the user's local date for filenames (and cleanup cutoff). `toISOString`
// returns UTC, which silently shifts the bucket boundary by the timezone
// offset — at e.g. 05:10 CST the UTC date is still the previous day, and
// entries land in yesterday's file. Renderer-side defaults already use local
// date, so the server has to match.
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayFileName(): string {
  return localDateStr() + '.jsonl'
}

function write(
  level: LogLevel,
  surface: LogSurface,
  message: string,
  detail?: Record<string, unknown> | null
) {
  const { severityNumber, severityText } = severityOf(level)
  if (severityNumber < MIN_SEVERITY) return

  let attributes: Record<string, unknown>
  let resource: LogRecord['resource']
  let traceId: string | undefined
  let originTraceId: string | undefined
  try {
    const ctx = currentTrace()
    traceId = ctx?.traceId
    originTraceId = ctx?.originTraceId
    attributes = toAttributes({ ...(ctx?.attributes ?? {}), ...(detail ?? {}) })
    resource = getResource()
  } catch {
    // The logger must never throw into a caller — degrade the record instead.
    attributes = toAttributes(detail)
    resource = {} as LogRecord['resource']
  }

  const record: LogRecord = {
    timestamp: new Date().toISOString(),
    severityNumber,
    severityText,
    body: message,
    scope: { name: surface },
    attributes,
    resource,
    ...(traceId ? { traceId } : {}),
    ...(originTraceId ? { originTraceId } : {})
  }

  const line = JSON.stringify(record) + '\n'
  // Fire-and-forget async write.
  appendFile(join(getLogsDir(), todayFileName()), line, 'utf-8').catch(() => {})

  // Also output to console for dev visibility.
  const consoleFn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log
  consoleFn(`[${severityText}] [${surface}] ${message}`, detail ?? '')
}

export function cleanupOldLogs() {
  const dir = getLogsDir()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffStr = localDateStr(cutoff)

  for (const file of readdirSync(dir)) {
    if (file.endsWith('.jsonl') && file.slice(0, 10) < cutoffStr) {
      unlinkSync(join(dir, file))
    }
  }
}

export const logger = {
  debug: (
    surface: LogSurface,
    message: string,
    detail?: Record<string, unknown> | null
  ) => write('debug', surface, message, detail),
  info: (
    surface: LogSurface,
    message: string,
    detail?: Record<string, unknown> | null
  ) => write('info', surface, message, detail),
  warn: (
    surface: LogSurface,
    message: string,
    detail?: Record<string, unknown> | null
  ) => write('warn', surface, message, detail),
  error: (
    surface: LogSurface,
    message: string,
    detail?: Record<string, unknown> | null
  ) => write('error', surface, message, detail)
}
