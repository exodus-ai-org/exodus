import { existsSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

import { Hono } from 'hono'

import {
  localDateStr,
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

// GET /api/logs — query log entries
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

// GET /api/logs/scopes — distinct scope names present in a day's file
logsRouter.get('/scopes', (c) => {
  const date = c.req.query('date') || localDateStr()
  const records = parseLogFile(join(getLogsDir(), `${date}.jsonl`))
  const scopes = [...new Set(records.map((r) => r.scope.name))].sort()
  return c.json({ scopes })
})

// GET /api/logs/dates — list available log dates
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

// GET /api/logs/export — download a day's log file
logsRouter.get('/export', (c) => {
  const date = c.req.query('date') || localDateStr()
  const filePath = join(getLogsDir(), `${date}.jsonl`)

  if (!existsSync(filePath)) {
    return c.json({ error: 'Log file not found' }, 404)
  }

  const content = readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${date}.jsonl"`
    }
  })
})

// DELETE /api/logs — clear all logs
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
