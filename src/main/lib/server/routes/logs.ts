import { existsSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

import { ErrorCode } from '@exodus/shared/constants/error-codes'
import { NotFoundError } from '@exodus/shared/errors/app-error'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  localDateStr,
  logger,
  type LogRecord,
  normalizeToLogRecord
} from '../../logger'
import { getLogsDir } from '../../paths'
import { filterRecords, minSeverityFromLevel } from './logs-filter'

function parseLogFile(filePath: string): LogRecord[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8')
  const entries: LogRecord[] = []
  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      const record = normalizeToLogRecord(JSON.parse(line))
      if (record) entries.push(record)
    } catch {
      // skip malformed lines
    }
  }
  return entries
}

const logsRouter = new Hono()

// GET /api/v1/logs — query log entries
logsRouter.get('/', (c) => {
  const date = c.req.query('date') || localDateStr()
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(
    500,
    Math.max(1, Number(c.req.query('pageSize')) || 100)
  )

  const entries = filterRecords(
    parseLogFile(join(getLogsDir(), `${date}.jsonl`)),
    {
      minSeverity: minSeverityFromLevel(c.req.query('level')),
      // Query param stays `surface` for URL stability; it matches scope.name.
      scope: c.req.query('surface'),
      keyword: c.req.query('keyword'),
      traceId: c.req.query('traceId')
    }
  )

  // Newest first
  entries.reverse()

  const total = entries.length
  const start = (page - 1) * pageSize
  const paged = entries.slice(start, start + pageSize)

  return c.json({ entries: paged, total, page })
})

// GET /api/v1/logs/scopes — distinct scope names present in a day's file
logsRouter.get('/scopes', (c) => {
  const date = c.req.query('date') || localDateStr()
  const records = parseLogFile(join(getLogsDir(), `${date}.jsonl`))
  const scopes = [...new Set(records.map((r) => r.scope.name))].sort()
  return c.json({ scopes })
})

// GET /api/v1/logs/dates — list available log dates
logsRouter.get('/dates', (c) => {
  const dir = getLogsDir()
  if (!existsSync(dir)) return c.json({ dates: [] })

  const dates = readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.replace('.jsonl', ''))
    .sort()
    .reverse()

  return c.json({ dates })
})

// GET /api/v1/logs/export — download a day's log file
logsRouter.get('/export', (c) => {
  const date = c.req.query('date') || localDateStr()
  const filePath = join(getLogsDir(), `${date}.jsonl`)

  if (!existsSync(filePath)) {
    throw new NotFoundError(ErrorCode.RESOURCE_NOT_FOUND, 'Log file not found')
  }

  const content = readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${date}.jsonl"`
    }
  })
})

// What one report from the renderer may carry. A stack is the biggest item;
// anything past the cap is cut, not refused, so a real error still lands.
const MAX_MESSAGE_CHARS = 2000
const MAX_ATTRIBUTE_CHARS = 8000

const reportSchema = z.object({
  level: z.enum(['warn', 'error']),
  scope: z.string().min(1).max(64),
  message: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).optional()
})

const clip = (value: unknown, max: number): unknown =>
  typeof value === 'string' && value.length > max
    ? `${value.slice(0, max - 1)}…`
    : value

// POST /api/v1/logs — an error the renderer caught (an error boundary, a
// route error). Renderer errors otherwise live only in DevTools; this puts
// them in the same JSONL the Logger tab reads, under a `renderer/<scope>`
// surface, so a card that failed to render is diagnosable after the fact.
logsRouter.post('/', async (c) => {
  const parsed = reportSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json(
      {
        type: 'error',
        error: { code: ErrorCode.VALIDATION_FAILED, message: 'Invalid report' }
      },
      400
    )
  }
  const { level, scope, message, attributes } = parsed.data
  const detail = attributes
    ? Object.fromEntries(
        Object.entries(attributes).map(([k, v]) => [
          k,
          clip(v, MAX_ATTRIBUTE_CHARS)
        ])
      )
    : undefined
  logger[level](
    `renderer/${scope}`,
    clip(message, MAX_MESSAGE_CHARS) as string,
    detail
  )
  return c.body(null, 204)
})

// DELETE /api/v1/logs — clear all logs
logsRouter.delete('/', (c) => {
  const dir = getLogsDir()
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)) {
      if (file.endsWith('.jsonl')) {
        unlinkSync(join(dir, file))
      }
    }
  }
  return c.json({ ok: true })
})

export default logsRouter
