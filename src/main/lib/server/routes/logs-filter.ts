import type { LogRecord } from '../../logger'

const LEVEL_FLOOR: Record<string, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17
}

/** The `severityNumber` floor for a UI level name; 0 (match all) for unknown/absent. */
export function minSeverityFromLevel(level: string | undefined): number {
  return level ? (LEVEL_FLOOR[level] ?? 0) : 0
}

export interface LogFilterOptions {
  minSeverity?: number
  scope?: string
  keyword?: string
  traceId?: string
}

export function filterRecords(
  records: LogRecord[],
  opts: LogFilterOptions
): LogRecord[] {
  const keyword = opts.keyword?.toLowerCase()
  return records.filter((r) => {
    if (opts.minSeverity && r.severityNumber < opts.minSeverity) return false
    if (opts.scope && r.scope.name !== opts.scope) return false
    if (keyword && !r.body.toLowerCase().includes(keyword)) return false
    if (opts.traceId && r.traceId !== opts.traceId) return false
    return true
  })
}
