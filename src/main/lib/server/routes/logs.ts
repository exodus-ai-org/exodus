import { existsSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

import { Hono } from 'hono'

import type { LogEntry, LogLevel } from '../../logger'
import { getLogsDir } from '../../paths'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

function parseLogFile(filePath: string): LogEntry[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8')
  const entries: LogEntry[] = []
  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      entries.push(JSON.parse(line))
    } catch {
      // skip malformed lines
    }
  }
  return entries
}

const logsRouter = new Hono()

// GET /api/logs — query log entries
logsRouter.get('/', (c) => {
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10)
  const level = c.req.query('level') as LogLevel | undefined
  const surface = c.req.query('surface')
  const keyword = c.req.query('keyword')?.toLowerCase()
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(
    500,
    Math.max(1, Number(c.req.query('pageSize')) || 100)
  )

  const filePath = join(getLogsDir(), `${date}.jsonl`)
  let entries = parseLogFile(filePath)

  // Filter by minimum level
  if (level) {
    const minPriority = LEVEL_PRIORITY[level] ?? 0
    entries = entries.filter((e) => LEVEL_PRIORITY[e.level] >= minPriority)
  }

  // Filter by surface
  if (surface) {
    entries = entries.filter((e) => e.surface === surface)
  }

  // Filter by keyword
  if (keyword) {
    entries = entries.filter((e) => e.message.toLowerCase().includes(keyword))
  }

  // Newest first
  entries.reverse()

  const total = entries.length
  const start = (page - 1) * pageSize
  const paged = entries.slice(start, start + pageSize)

  return c.json({ entries: paged, total, page })
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
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10)
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
