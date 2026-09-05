import {
  normalizeToLogRecord,
  severityOf,
  toAttributes
} from '@main/lib/logger/record'
import { describe, expect, it } from 'vitest'

describe('severityOf', () => {
  it('maps levels to OTel bands', () => {
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
  it('returns {} for nullish detail', () => {
    expect(toAttributes()).toEqual({})
    expect(toAttributes(null)).toEqual({})
  })

  it('passes non-error keys through untouched', () => {
    expect(toAttributes({ chatId: 'c1', count: 3 })).toEqual({
      chatId: 'c1',
      count: 3
    })
  })

  it('expands an Error into exception.* conventions', () => {
    const err = new TypeError('boom')
    const attrs = toAttributes({ error: err, chatId: 'c1' })
    expect(attrs).not.toHaveProperty('error')
    expect(attrs['exception.type']).toBe('TypeError')
    expect(attrs['exception.message']).toBe('boom')
    expect(typeof attrs['exception.stacktrace']).toBe('string')
    expect(attrs.chatId).toBe('c1')
  })

  it('expands a string error with no stacktrace', () => {
    const attrs = toAttributes({ error: 'nope' })
    expect(attrs['exception.type']).toBe('Error')
    expect(attrs['exception.message']).toBe('nope')
    expect(attrs).not.toHaveProperty('exception.stacktrace')
  })
})

describe('normalizeToLogRecord', () => {
  it('passes a new-shape record through', () => {
    const rec = {
      timestamp: '2026-09-06T00:00:00.000Z',
      severityNumber: 17,
      severityText: 'ERROR',
      body: 'x',
      scope: { name: 'chat' },
      attributes: {},
      resource: {}
    }
    expect(normalizeToLogRecord(rec)).toEqual(rec)
  })

  it('maps a legacy line', () => {
    const out = normalizeToLogRecord({
      ts: '2026-09-05T10:00:00.000Z',
      level: 'warn',
      surface: 'jobs',
      message: 'old style',
      detail: { msgId: 7 }
    })
    expect(out).toMatchObject({
      timestamp: '2026-09-05T10:00:00.000Z',
      severityNumber: 13,
      severityText: 'WARN',
      body: 'old style',
      scope: { name: 'jobs' },
      attributes: { msgId: 7 }
    })
  })

  it('returns null for garbage', () => {
    expect(normalizeToLogRecord('nope')).toBeNull()
    expect(normalizeToLogRecord({ random: 1 })).toBeNull()
    expect(normalizeToLogRecord(null)).toBeNull()
  })
})
