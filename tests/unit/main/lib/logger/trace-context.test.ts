import {
  bindTraceAttributes,
  currentTrace,
  newTraceId,
  withTrace
} from '@main/lib/logger/trace-context'
import { describe, expect, it } from 'vitest'

describe('trace-context', () => {
  it('newTraceId is 32 lowercase hex', () => {
    expect(newTraceId()).toMatch(/^[0-9a-f]{32}$/)
  })

  it('currentTrace is undefined outside withTrace', () => {
    expect(currentTrace()).toBeUndefined()
  })

  it('withTrace establishes a fresh id', () => {
    const seen: string[] = []
    withTrace(() => seen.push(currentTrace()!.traceId))
    withTrace(() => seen.push(currentTrace()!.traceId))
    expect(seen[0]).not.toBe(seen[1])
    expect(seen[0]).toMatch(/^[0-9a-f]{32}$/)
  })

  it('nested withTrace shadows with a new id, restores on exit', () => {
    withTrace(() => {
      const outer = currentTrace()!.traceId
      withTrace(() => {
        expect(currentTrace()!.traceId).not.toBe(outer)
      })
      expect(currentTrace()!.traceId).toBe(outer)
    })
  })

  it('carries originTraceId and seed attributes', () => {
    withTrace(
      () => {
        expect(currentTrace()!.originTraceId).toBe('abc')
        expect(currentTrace()!.attributes).toEqual({ queueName: 'kb-sync' })
      },
      { originTraceId: 'abc', attributes: { queueName: 'kb-sync' } }
    )
  })

  it('bindTraceAttributes merges; no-op outside a trace', () => {
    expect(() => bindTraceAttributes({ x: 1 })).not.toThrow()
    withTrace(() => {
      bindTraceAttributes({ chatId: 'c1' })
      bindTraceAttributes({ step: 2 })
      expect(currentTrace()!.attributes).toEqual({ chatId: 'c1', step: 2 })
    })
  })

  it('survives an await boundary', async () => {
    await withTrace(async () => {
      const id = currentTrace()!.traceId
      await new Promise((r) => setTimeout(r, 1))
      expect(currentTrace()!.traceId).toBe(id)
    })
  })
})
