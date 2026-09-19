import { severityOf, toAttributes } from '@main/lib/logger/record'
import { describe, expect, it } from 'vitest'

describe('severityOf', () => {
  it('maps each level to its OpenTelemetry-style severity number/text', () => {
    expect(severityOf('debug')).toEqual({
      severityNumber: 5,
      severityText: 'DEBUG'
    })
    expect(severityOf('info')).toEqual({
      severityNumber: 9,
      severityText: 'INFO'
    })
    expect(severityOf('warn')).toEqual({
      severityNumber: 13,
      severityText: 'WARN'
    })
    expect(severityOf('error')).toEqual({
      severityNumber: 17,
      severityText: 'ERROR'
    })
  })
})

describe('toAttributes', () => {
  it('returns an empty object for null/undefined detail', () => {
    expect(toAttributes(null)).toEqual({})
    expect(toAttributes(undefined)).toEqual({})
  })

  it('passes plain fields through unchanged', () => {
    expect(toAttributes({ queueName: 'jobs', count: 3 })).toEqual({
      queueName: 'jobs',
      count: 3
    })
  })

  it('expands an Error `error` field into exception.* attributes', () => {
    const err = new Error('boom')
    const attrs = toAttributes({ error: err, extra: 'kept' })
    expect(attrs['exception.type']).toBe('Error')
    expect(attrs['exception.message']).toBe('boom')
    expect(attrs['exception.stacktrace']).toBe(err.stack)
    expect(attrs.extra).toBe('kept')
    expect(attrs.error).toBeUndefined()
  })

  it('stringifies a non-Error `error` field', () => {
    const attrs = toAttributes({ error: 'plain string error' })
    expect(attrs['exception.type']).toBe('Error')
    expect(attrs['exception.message']).toBe('plain string error')
  })
})
