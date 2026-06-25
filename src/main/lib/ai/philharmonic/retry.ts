// src/main/lib/ai/philharmonic/retry.ts
//
// Decorrelated-jitter retry with transient-error classification, used to
// shield employee execution from network/rate-limit blips without retrying
// permanent failures (auth, validation, user abort).
//
// Backoff formula (AWS Architecture Blog "Exponential Backoff And Jitter"):
//   sleep = min(cap, random_uniform(base, prev_sleep * 3))
// First attempt seeds `prev` with `base`, so it can sleep anywhere in
// [base, base*3] before the second try.

export interface RetryPolicy {
  baseMs: number
  capMs: number
  /** Maximum number of total attempts including the first. So `maxAttempts: 3`
   * means at most 2 retries. */
  maxAttempts: number
}

export const DEFAULT_POLICY: RetryPolicy = {
  baseMs: 1000,
  capMs: 30_000,
  maxAttempts: 3
}

/**
 * Heuristic transient classifier. We intentionally err on the side of
 * "don't retry" — repeating a permanent failure burns money and frustrates
 * the user. Network/timeout codes, HTTP 429/5xx, and well-known rate-limit
 * phrases are the buckets that actually benefit from retry.
 */
export function isTransientError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return false

  // Node net errors
  const code = (err as { code?: string } | null)?.code
  if (code) {
    if (
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'EAI_AGAIN' ||
      code === 'ENETUNREACH' ||
      code === 'ETLSCONNECT'
    ) {
      return true
    }
  }

  // HTTP status (some SDKs attach `.status`)
  const status = err as { status?: number; statusCode?: number } | null
  const httpStatus = status?.status ?? status?.statusCode
  if (httpStatus === 408 || httpStatus === 429) return true
  if (
    httpStatus === 500 ||
    httpStatus === 502 ||
    httpStatus === 503 ||
    httpStatus === 504
  )
    return true

  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!message) return false
  if (/rate.?limit/i.test(message)) return true
  if (/overloaded/i.test(message)) return true
  if (/temporarily unavailable/i.test(message)) return true
  if (/server error/i.test(message) && !/auth/i.test(message)) return true
  if (/timeout/i.test(message)) return true
  if (/ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(message)) return true

  return false
}

/**
 * Decorrelated jitter. Caller supplies the previous sleep (use `policy.baseMs`
 * for the first call) and gets the next one back.
 */
export function nextDelayMs(prevMs: number, policy: RetryPolicy): number {
  const lo = policy.baseMs
  const hi = Math.min(policy.capMs, Math.max(lo, prevMs * 3))
  if (hi <= lo) return lo
  return Math.floor(lo + Math.random() * (hi - lo))
}

export interface WithRetryOpts {
  policy?: RetryPolicy
  signal?: AbortSignal
  /** Called immediately before each sleep. Useful for SSE retry events. */
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void
}

export async function withRetry<T>(
  task: () => Promise<T>,
  opts: WithRetryOpts = {}
): Promise<T> {
  const policy = opts.policy ?? DEFAULT_POLICY
  let prevDelay = policy.baseMs
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    if (opts.signal?.aborted) {
      throw new DOMException('aborted', 'AbortError')
    }
    try {
      return await task()
    } catch (err) {
      const last = attempt >= policy.maxAttempts
      if (last || !isTransientError(err)) throw err
      const delay = nextDelayMs(prevDelay, policy)
      prevDelay = delay
      opts.onRetry?.(attempt, delay, err)
      await sleep(delay, opts.signal)
    }
  }
  // Unreachable — the loop either returns or throws, but TS doesn't know.
  throw new Error('withRetry exhausted attempts without returning')
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'))
      return
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
