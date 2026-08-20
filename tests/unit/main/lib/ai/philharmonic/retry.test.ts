import {
  DEFAULT_POLICY,
  isTransientError,
  nextDelayMs,
  withRetry
} from '@main/lib/ai/philharmonic/retry'
// src/main/lib/ai/philharmonic/retry.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isTransientError', () => {
  it('treats AbortError as permanent so aborts short-circuit retries', () => {
    const err = new DOMException('aborted', 'AbortError')
    expect(isTransientError(err)).toBe(false)
  })

  it('matches common transient codes and statuses', () => {
    expect(
      isTransientError(Object.assign(new Error('x'), { code: 'ETIMEDOUT' }))
    ).toBe(true)
    expect(
      isTransientError(Object.assign(new Error('x'), { code: 'ECONNRESET' }))
    ).toBe(true)
    expect(
      isTransientError(Object.assign(new Error('x'), { status: 429 }))
    ).toBe(true)
    expect(
      isTransientError(Object.assign(new Error('x'), { statusCode: 503 }))
    ).toBe(true)
  })

  it('matches rate-limit and overloaded phrasing in messages', () => {
    expect(
      isTransientError(new Error('Rate limit exceeded, retry later'))
    ).toBe(true)
    expect(isTransientError(new Error('upstream overloaded'))).toBe(true)
    expect(isTransientError(new Error('temporarily unavailable'))).toBe(true)
  })

  it('does not retry on auth/validation/permanent errors', () => {
    expect(isTransientError(new Error('Invalid API key'))).toBe(false)
    expect(isTransientError(new Error('Bad request: missing field'))).toBe(
      false
    )
    expect(
      isTransientError(Object.assign(new Error('x'), { status: 400 }))
    ).toBe(false)
    expect(
      isTransientError(Object.assign(new Error('x'), { status: 401 }))
    ).toBe(false)
  })
})

describe('nextDelayMs', () => {
  it('lies in [base, min(cap, prev*3)]', () => {
    for (let i = 0; i < 100; i++) {
      const d = nextDelayMs(1000, {
        baseMs: 1000,
        capMs: 10_000,
        maxAttempts: 5
      })
      expect(d).toBeGreaterThanOrEqual(1000)
      expect(d).toBeLessThanOrEqual(3000)
    }
  })

  it('respects the cap once prev*3 exceeds it', () => {
    const d = nextDelayMs(20_000, { baseMs: 1000, capMs: 5000, maxAttempts: 5 })
    expect(d).toBeGreaterThanOrEqual(1000)
    expect(d).toBeLessThanOrEqual(5000)
  })
})

describe('withRetry', () => {
  it('returns the result of the first successful attempt', async () => {
    const task = vi.fn(async () => 42)
    expect(await withRetry(task)).toBe(42)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('retries transient failures until success', async () => {
    let n = 0
    const task = vi.fn(async () => {
      n += 1
      if (n < 3) throw Object.assign(new Error('x'), { status: 503 })
      return 'ok'
    })
    const onRetry = vi.fn()
    const result = await withRetry(task, {
      policy: { baseMs: 1, capMs: 5, maxAttempts: 5 },
      onRetry
    })
    expect(result).toBe('ok')
    expect(task).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on permanent errors', async () => {
    const task = vi.fn(async () => {
      throw new Error('Invalid API key')
    })
    await expect(withRetry(task)).rejects.toThrow(/Invalid API key/)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('rethrows on transient errors once max attempts reached', async () => {
    const task = vi.fn(async () => {
      throw Object.assign(new Error('Rate limit'), { status: 429 })
    })
    await expect(
      withRetry(task, {
        policy: { baseMs: 1, capMs: 5, maxAttempts: 2 }
      })
    ).rejects.toThrow(/Rate limit/)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('short-circuits when the abort signal fires between retries', async () => {
    const controller = new AbortController()
    const task = vi.fn(async () => {
      throw Object.assign(new Error('overloaded'), { status: 503 })
    })
    const onRetry = vi.fn(() => controller.abort())
    await expect(
      withRetry(task, {
        policy: { baseMs: 5, capMs: 10, maxAttempts: 5 },
        signal: controller.signal,
        onRetry
      })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('uses defaults when no policy is provided', () => {
    expect(DEFAULT_POLICY.maxAttempts).toBeGreaterThan(1)
  })
})
