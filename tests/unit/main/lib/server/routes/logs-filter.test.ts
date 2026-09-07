import type { LogRecord } from '@main/lib/logger'
import {
  filterRecords,
  minSeverityFromLevel
} from '@main/lib/server/routes/logs-filter'
import { describe, expect, it } from 'vitest'

const rec = (over: Partial<LogRecord> = {}): LogRecord =>
  ({
    timestamp: '2026-09-06T00:00:00.000Z',
    severityNumber: 9,
    severityText: 'INFO',
    body: 'hello world',
    scope: { name: 'chat' },
    attributes: {},
    resource: {} as LogRecord['resource'],
    ...over
  }) as LogRecord

describe('minSeverityFromLevel', () => {
  it('maps level names to their severity floor', () => {
    expect(minSeverityFromLevel('debug')).toBe(5)
    expect(minSeverityFromLevel('warn')).toBe(13)
    expect(minSeverityFromLevel('error')).toBe(17)
    expect(minSeverityFromLevel('bogus')).toBe(0)
    expect(minSeverityFromLevel(undefined)).toBe(0)
  })
})

describe('filterRecords', () => {
  it('filters by minimum severity', () => {
    const out = filterRecords(
      [rec({ severityNumber: 9 }), rec({ severityNumber: 17 })],
      { minSeverity: minSeverityFromLevel('warn') }
    )
    expect(out).toHaveLength(1)
    expect(out[0].severityNumber).toBe(17)
  })

  it('filters by scope name', () => {
    expect(
      filterRecords(
        [rec({ scope: { name: 'chat' } }), rec({ scope: { name: 'jobs' } })],
        { scope: 'jobs' }
      )
    ).toHaveLength(1)
  })

  it('filters by body keyword, case-insensitive', () => {
    expect(
      filterRecords([rec({ body: 'Hello World' }), rec({ body: 'nope' })], {
        keyword: 'world'
      })
    ).toHaveLength(1)
  })

  it('filters by exact traceId', () => {
    expect(
      filterRecords([rec({ traceId: 'aaaa' }), rec({ traceId: 'bbbb' })], {
        traceId: 'bbbb'
      })
    ).toHaveLength(1)
  })

  it('combines every filter', () => {
    const out = filterRecords(
      [
        rec({
          severityNumber: 17,
          scope: { name: 'jobs' },
          body: 'boom',
          traceId: 't1'
        }),
        rec({
          severityNumber: 17,
          scope: { name: 'jobs' },
          body: 'boom',
          traceId: 't2'
        }),
        rec({
          severityNumber: 9,
          scope: { name: 'jobs' },
          body: 'boom',
          traceId: 't1'
        })
      ],
      { minSeverity: 13, scope: 'jobs', keyword: 'boom', traceId: 't1' }
    )
    expect(out).toHaveLength(1)
  })

  it('returns everything when no options are set', () => {
    expect(filterRecords([rec(), rec()], {})).toHaveLength(2)
  })
})
