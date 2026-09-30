// What the logger would write for the calls a mocked `logger.*` received.
// A caught Error is logged as the Error itself, and `JSON.stringify` makes
// `{}` of one — so a guard written as `JSON.stringify(mock.calls)` would see
// neither its message nor its stack, and "the log never holds the key" would
// pass without looking. This serializes each call's detail the way the logger
// does (`toAttributes`: `exception.message`, `exception.stacktrace`, …).
import { toAttributes } from '@main/lib/logger/record'

export function writtenBy(calls: readonly unknown[][]): string {
  return JSON.stringify(
    calls.map(([surface, message, detail]) => [
      surface,
      message,
      toAttributes(detail as Record<string, unknown> | null | undefined)
    ])
  )
}
