import type { Attempt, ChatMessage } from '../types/chat'
import { applyAttempts } from './attempts'

/**
 * A client's conversation once a run has ended, under protocol 2 (spec
 * 2026-10-01 §C2): the server's `done` carries the run as stored — its
 * question, then its answer — and every regenerate group's state, not the
 * whole conversation again. The run's local copies (the optimistic question,
 * the streamed answer) are replaced by the stored run where they stood; a run
 * not shown yet goes at the end; then every run takes its stored state.
 * Messages of other runs keep their identity (the render path memoizes on it).
 */
export function mergeRun(
  messages: ChatMessage[],
  run: ChatMessage[],
  attempts: Record<string, Attempt>
): ChatMessage[] {
  const runId = run[0]?.runId
  if (!runId) return applyAttempts(messages, attempts)
  const at = messages.findIndex((m) => m.runId === runId)
  const others = messages.filter((m) => m.runId !== runId)
  const merged =
    at === -1
      ? [...others, ...run]
      : [...others.slice(0, at), ...run, ...others.slice(at)]
  return applyAttempts(merged, attempts)
}
