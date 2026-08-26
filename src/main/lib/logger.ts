import { readdirSync, unlinkSync } from 'fs'
import { appendFile } from 'fs/promises'
import { join } from 'path'

import { is } from '@electron-toolkit/utils'

import { getLogsDir } from './paths'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSurface =
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

export interface LogEntry {
  ts: string
  level: LogLevel
  surface: LogSurface
  message: string
  detail?: Record<string, unknown> | null
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const MIN_LEVEL: LogLevel = is.dev ? 'debug' : 'info'
const RETENTION_DAYS = 7

// Use the user's local date for filenames (and cleanup cutoff). `toISOString`
// returns UTC, which silently shifts the bucket boundary by the timezone offset
// — at e.g. 05:10 CST the UTC date is still the previous day, and entries land
// in yesterday's file. Renderer-side defaults already use local date, so the
// server has to match.
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayFileName(): string {
  return localDateStr() + '.jsonl'
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function write(
  level: LogLevel,
  surface: LogSurface,
  message: string,
  detail?: Record<string, unknown> | null
) {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    surface,
    message,
    ...(detail != null ? { detail } : {})
  }

  const line = JSON.stringify(entry) + '\n'
  const filePath = join(getLogsDir(), todayFileName())

  // Fire-and-forget async write
  appendFile(filePath, line, 'utf-8').catch(() => {})

  // Also output to console for dev visibility
  const consoleFn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log
  consoleFn(`[${level.toUpperCase()}] [${surface}] ${message}`, detail ?? '')
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
