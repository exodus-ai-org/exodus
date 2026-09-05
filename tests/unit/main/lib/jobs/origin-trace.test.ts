import {
  applyOriginTraceId,
  extractOriginTraceId
} from '@main/lib/jobs/origin-trace'
import { withTrace } from '@main/lib/logger/trace-context'
import { describe, expect, it } from 'vitest'

describe('applyOriginTraceId', () => {
  it('stamps the ambient traceId onto an object payload', () => {
    const out = withTrace(() =>
      applyOriginTraceId({ op: 'delete', lightragDocId: 'd1' })
    ) as Record<string, unknown>
    expect(out.op).toBe('delete')
    expect(out.__originTraceId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('returns the payload unchanged when no trace is active', () => {
    const payload = { op: 'delete' }
    expect(applyOriginTraceId(payload)).toBe(payload)
  })

  it('leaves non-object payloads alone even inside a trace', () => {
    withTrace(() => {
      expect(applyOriginTraceId(null)).toBeNull()
      expect(applyOriginTraceId(42)).toBe(42)
    })
  })
})

describe('extractOriginTraceId', () => {
  it('reads the sibling field', () => {
    expect(extractOriginTraceId({ a: 1, __originTraceId: 'abc' })).toBe('abc')
  })

  it('is undefined when absent or unusable', () => {
    expect(extractOriginTraceId({ a: 1 })).toBeUndefined()
    expect(extractOriginTraceId('nope')).toBeUndefined()
    expect(extractOriginTraceId(null)).toBeUndefined()
  })

  it('coerces a non-string sibling to string', () => {
    expect(extractOriginTraceId({ __originTraceId: 42 })).toBe('42')
  })

  it('round-trips with applyOriginTraceId', () => {
    const stamped = withTrace(() => applyOriginTraceId({ x: 1 }))
    expect(extractOriginTraceId(stamped)).toMatch(/^[0-9a-f]{32}$/)
  })
})
