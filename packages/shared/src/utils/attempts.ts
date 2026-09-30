// Regenerate groups (spec 2026-09-26), as pure functions of a chat's runs:
// which runs the model sees, and what each transition leaves behind.
//
// The state is stored and decided by the main process
// (`src/main/lib/chat/attempts.ts`, the only writer of `message.attempt`). The
// transitions here are what a client shows before the server has answered —
// the comparison while the new answer streams, the choice the moment it is
// made — and hold the same rules; the server's state replaces them when it
// arrives (`done`, the choose route's response).
//
// A group is its first run G plus every run whose user message has
// `alternateOf = G`. "Newer" is later in the list: a chat's messages are in
// the order they were sent.
import type { Attempt, ChatMessage } from '../types/chat'

/** A run as its user message describes it. */
export interface RunAttemptInfo {
  runId: string
  alternateOf: string | null
  attempt: Attempt | null
}

/** The run being answered, when context is assembled for it. */
export interface CurrentRun {
  runId: string
  alternateOf: string | null
}

/** Not shown and never context: an older attempt, or the one not chosen. */
const OUT_OF_VIEW: ReadonlySet<Attempt> = new Set(['folded', 'hidden'])

/** A run's answer counts as failed when its last assistant message ended so. */
const FAILED_STOP_REASONS: ReadonlySet<string> = new Set(['error', 'aborted'])

const groupOf = (run: { runId: string; alternateOf: string | null }) =>
  run.alternateOf ?? run.runId

/** The runs of a chat, one per user message that opens a run, in order. */
export function runAttemptInfos(messages: ChatMessage[]): RunAttemptInfo[] {
  const runs: RunAttemptInfo[] = []
  for (const m of messages) {
    if (m.role !== 'user' || (m.runId ?? m.id) !== m.id) continue
    runs.push({
      runId: m.id,
      alternateOf: m.alternateOf ?? null,
      attempt: m.attempt ?? null
    })
  }
  return runs
}

/**
 * Run ids to drop from model context: folded and hidden runs, and — for a
 * current run that regenerates group G — every other run of G, whatever its
 * state: the new answer must not see the answer it replaces, nor the question
 * a second time.
 */
export function excludedRuns(
  runs: RunAttemptInfo[],
  current?: CurrentRun
): Set<string> {
  const excluded = new Set<string>()
  for (const run of runs) {
    if (run.attempt && OUT_OF_VIEW.has(run.attempt)) excluded.add(run.runId)
    if (
      current?.alternateOf &&
      run.runId !== current.runId &&
      groupOf(run) === current.alternateOf
    ) {
      excluded.add(run.runId)
    }
  }
  return excluded
}

/** `messages` without the rows of the runs `excludedRuns` names. */
export function runsForContext<T extends { runId: string }>(
  messages: T[],
  infos: RunAttemptInfo[],
  current?: CurrentRun
): T[] {
  const excluded = excludedRuns(infos, current)
  if (excluded.size === 0) return messages
  return messages.filter((m) => !excluded.has(m.runId))
}

/**
 * `messages` with each user message's `attempt` replaced by the one given (a
 * run the map does not name has none). A message is returned as is when
 * nothing changes, so its identity is kept.
 */
export function applyAttempts<T extends ChatMessage>(
  messages: T[],
  attempts: Record<string, Attempt>
): T[] {
  return messages.map((m) => {
    if (m.role !== 'user') return m
    const next = attempts[m.id] ?? null
    if ((m.attempt ?? null) === next) return m
    return { ...m, attempt: next }
  })
}

/** Every run of the chat that has a state, by run id. */
export function chatAttempts(messages: ChatMessage[]): Record<string, Attempt> {
  return attemptsOf(runAttemptInfos(messages))
}

function attemptsOf(runs: RunAttemptInfo[]): Record<string, Attempt> {
  const out: Record<string, Attempt> = {}
  for (const run of runs) if (run.attempt) out[run.runId] = run.attempt
  return out
}

/**
 * The chat's states once `newRunId` — already in the list, its user message
 * naming the group in `alternateOf` — has re-asked its group: the new run and
 * the newest other visible run of the group are `comparing`, every other run
 * of the group `hidden`.
 */
export function attemptsAfterRegenerate(
  messages: ChatMessage[],
  newRunId: string
): Record<string, Attempt> {
  const runs = runAttemptInfos(messages)
  const attempts = attemptsOf(runs)
  const fresh = runs.find((r) => r.runId === newRunId)
  if (!fresh?.alternateOf) return attempts

  const others = runs
    .filter((r) => r.runId !== newRunId && groupOf(r) === fresh.alternateOf)
    .toReversed()
  if (others.length === 0) return attempts
  const partner =
    others.find((r) => !r.attempt || !OUT_OF_VIEW.has(r.attempt)) ?? others[0]

  attempts[newRunId] = 'comparing'
  for (const run of others) {
    attempts[run.runId] = run === partner ? 'comparing' : 'hidden'
  }
  return attempts
}

/**
 * The chat's states once the user has picked `runId`: it is `chosen`, the
 * group's other visible run `folded`. `null` when the pick is refused — a run
 * in no group, a hidden attempt, or a swap after a later run exists. Picking
 * the chosen answer again changes nothing.
 */
export function attemptsAfterChoice(
  messages: ChatMessage[],
  runId: string
): Record<string, Attempt> | null {
  const runs = runAttemptInfos(messages)
  const target = runs.find((r) => r.runId === runId)
  if (!target?.attempt) return null
  const group = groupOf(target)
  const members = runs.filter((r) => groupOf(r) === group)
  if (members.length < 2) return null

  const attempts = attemptsOf(runs)
  if (target.attempt === 'chosen') return attempts
  if (target.attempt === 'hidden' || isLocked(runs, group)) return null

  for (const run of members) {
    if (run === target) attempts[run.runId] = 'chosen'
    else if (run.attempt === 'comparing' || run.attempt === 'chosen') {
      attempts[run.runId] = 'folded'
    }
  }
  return attempts
}

/** Whether a run later than the group exists: its choice can no longer move. */
export function isLocked(runs: RunAttemptInfo[], groupId: string): boolean {
  const last = runs.findLastIndex((r) => groupOf(r) === groupId)
  return last >= 0 && last < runs.length - 1
}

/**
 * The chat's states once the user has moved on without choosing: of each open
 * comparison, the newest answer that did not fail or stop is `chosen` — when
 * every one did, the oldest — and the other `folded`.
 */
export function attemptsAfterSettling(
  messages: ChatMessage[]
): Record<string, Attempt> {
  const runs = runAttemptInfos(messages)
  const attempts = attemptsOf(runs)
  const open = new Map<string, RunAttemptInfo[]>()
  for (const run of runs) {
    if (run.attempt !== 'comparing') continue
    open.set(groupOf(run), [...(open.get(groupOf(run)) ?? []), run])
  }
  if (open.size === 0) return attempts

  const failed = failedRuns(messages)
  for (const comparing of open.values()) {
    const pick = comparing.findLast((r) => !failed.has(r.runId)) ?? comparing[0]
    for (const run of comparing) {
      attempts[run.runId] = run === pick ? 'chosen' : 'folded'
    }
  }
  return attempts
}

/** The runs whose last assistant message failed or stopped, or that have none. */
function failedRuns(messages: ChatMessage[]): Set<string> {
  const lastStop = new Map<string, string | undefined>()
  for (const m of messages) {
    if (m.role === 'assistant') lastStop.set(m.runId, m.stopReason)
  }
  const failed = new Set<string>()
  for (const run of runAttemptInfos(messages)) {
    const stop = lastStop.get(run.runId)
    if (!lastStop.has(run.runId) || FAILED_STOP_REASONS.has(stop ?? '')) {
      failed.add(run.runId)
    }
  }
  return failed
}
