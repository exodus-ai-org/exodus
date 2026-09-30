/**
 * pi keeps the message of whatever is thrown into it and nothing else: a
 * throw from `streamFn`, from `convertToLlm`, from `beforeToolCall` or from
 * the kernel's own listener ends as `errorMessage` on an assistant message
 * (pi-agent-core's `handleRunFailure`) or as a tool result's text, and the
 * Error — its stack, the line that threw — is gone by the time the run
 * reports a failure. So the kernel's own functions are wrapped: the Error is
 * logged here, once, and thrown on, and what the run does next is unchanged.
 *
 * What is thrown inside pi itself (a provider's request builder, its stream
 * parser) never reaches this: pi catches it where it happens.
 *
 * The logger is imported when there is something to log, not with this
 * module: `models.ts` is loaded by code that has no Electron `app` to read
 * (the logger reads it at import), the providers' unit tests among it.
 */

// An error passing through two wrapped functions is logged by the first.
const logged = new WeakSet<object>()

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/**
 * Logs `error` as thrown by `where`, unless it is an abort or was logged
 * already. For a `catch` that keeps only the message; a function is wrapped
 * with `loggingThrows` instead.
 */
export function logThrown(
  where: string,
  error: unknown,
  context?: () => Record<string, unknown>
): void {
  try {
    // Stop is not a failure.
    if (isAbort(error)) return
    if (typeof error === 'object' && error !== null) {
      if (logged.has(error)) return
      logged.add(error)
    }
    let attributes: Record<string, unknown> = {}
    try {
      attributes = context?.() ?? {}
    } catch {
      // The error is what matters; it is logged without its context.
    }
    const detail = { ...attributes, error }
    void import('../../logger')
      .then(({ logger }) => logger.error('kernel', `${where} threw`, detail))
      .catch(() => {})
  } catch {
    // Logging never replaces the error being thrown.
  }
}

/**
 * `fn`, logging what it throws (or rejects with) before throwing it on.
 * `context` names what the log line carries beside the error — ids, never
 * the arguments themselves (they hold the conversation and the key).
 */
export function loggingThrows<A extends unknown[], R>(
  where: string,
  fn: (...args: A) => R,
  context?: (...args: A) => Record<string, unknown>
): (...args: A) => R {
  return (...args: A): R => {
    const attributes = context && (() => context(...args))
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          logThrown(where, error, attributes)
          throw error
        }) as R
      }
      return result
    } catch (error) {
      logThrown(where, error, attributes)
      throw error
    }
  }
}
