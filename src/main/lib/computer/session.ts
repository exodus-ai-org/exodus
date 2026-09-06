// Computer Runtime — the perceive→act session loop.
//
// The integration hub: wires the Runtime (target resolution, capture, guard,
// hands) and a swappable inner `ComputerAgent` into one bounded loop, wrapped in
// a trace. Spec §1 (the loop diagram), §3.5 (loop controls, askHuman, stuck),
// §3.6 (trace).
//
// Nothing the loop awaits — the agent's `nextAction`, or the helper-backed
// `resolveTarget` / `refreshBounds` / `screenshotWindow` / `hands.execute` —
// takes an abort signal or a timeout of its own, so every one goes through
// `race()`, which bounds it against the run's `AbortSignal` and a deadline.
// `maxSteps` is the final backstop.

import type { ComputerAgent } from '../ai/computer-use/agent'
import { logger } from '../logger'
import { bindTraceAttributes, withTrace } from '../logger/trace-context'
import { computerAskRegistry } from './ask-registry'
import { hashPng, screenshotWindow } from './capture'
import { AbortedByUser, Guard, OutOfBounds } from './guard'
import * as hands from './hands'
import { getHelper } from './helper'
import { refreshBounds, resolveTarget } from './target'
import type {
  Action,
  ComputerState,
  InputHelper,
  SessionOutcome,
  SessionResult,
  TargetWindow
} from './types'

/** Loop-control defaults (spec §3.5). All overridable per call / by settings. */
const DEFAULT_MAX_STEPS = 25
const DEFAULT_SETTLE_MS = 800
const DEFAULT_ASK_HUMAN_TIMEOUT_MS = 300_000
const DEFAULT_STEP_TIMEOUT_MS = 120_000
const DEFAULT_OP_TIMEOUT_MS = 30_000

/** The synthetic question injected on the first frozen ("stuck") frame. */
const STUCK_QUESTION =
  "I don't seem to be making progress — the screen hasn't changed. What " +
  'should I do, or should I stop?'

/**
 * Streamed by the session as it runs. The outer tool relays these over the chat
 * SSE (`onUpdate`) so the panel can show the current step, the last action, an
 * optional thumbnail, an inline askHuman prompt, and the final outcome.
 */
export interface SessionUpdate {
  step: number
  action?: Action['kind']
  thumbnail?: string
  awaitingHuman?: { question: string }
  outcome?: SessionOutcome
}

export interface RunComputerSessionOptions {
  sessionId: string
  task: string
  /** App name / bundle-id query resolved to the target window (spec §2.2). */
  target: string
  agent: ComputerAgent
  helper?: InputHelper
  guard?: Guard
  maxSteps?: number
  settleMs?: number
  askHumanTimeoutMs?: number
  /** Deadline for one `agent.nextAction` call. */
  stepTimeoutMs?: number
  /** Deadline for one helper-backed Runtime op (capture, bounds, execute). */
  opTimeoutMs?: number
  signal?: AbortSignal
  onUpdate?: (u: SessionUpdate) => void
}

/**
 * Bound `op` by an abort signal and a timeout. Rejects with `AbortedByUser` the
 * instant `signal` fires (or immediately if it is already aborted), and with a
 * plain `Error` when `timeoutMs` elapses first. A guard winning the race
 * abandons `op` — there is no way to cancel the underlying work, so callers must
 * tolerate a late settle (its rejection is swallowed here so it cannot surface
 * as an unhandledRejection).
 */
export async function race<T>(
  op: Promise<T>,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  label: string
): Promise<T> {
  if (signal?.aborted) throw new AbortedByUser('user')

  op.catch(() => {})

  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  })
  const aborted = new Promise<never>((_, reject) => {
    if (!signal) return
    onAbort = () => reject(new AbortedByUser('user'))
    signal.addEventListener('abort', onAbort, { once: true })
  })

  try {
    return await Promise.race([op, timeout, aborted])
  } finally {
    if (timer) clearTimeout(timer)
    if (signal && onAbort) signal.removeEventListener('abort', onAbort)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Run one computer-use episode to a terminal `SessionResult`. Blocking: the
 * caller awaits the whole loop and watches `onUpdate` for progress. The episode
 * shares one traceId (`withTrace`); every `logger.*` call inside carries it.
 */
export async function runComputerSession(
  opts: RunComputerSessionOptions
): Promise<SessionResult> {
  const helper = opts.helper ?? getHelper()
  const guard = opts.guard ?? new Guard()
  const { agent, signal, sessionId } = opts
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS
  const settleMs = opts.settleMs ?? DEFAULT_SETTLE_MS
  const askHumanTimeoutMs =
    opts.askHumanTimeoutMs ?? DEFAULT_ASK_HUMAN_TIMEOUT_MS
  const stepTimeoutMs = opts.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS
  const opTimeoutMs = opts.opTimeoutMs ?? DEFAULT_OP_TIMEOUT_MS

  return withTrace(async () => {
    bindTraceAttributes({ computerSession: sessionId, target: opts.target })

    let step = 0
    let lastShot: ComputerState['screenshot'] | undefined

    const emit = (u: SessionUpdate): void => {
      try {
        opts.onUpdate?.(u)
      } catch (err) {
        logger.warn('computer', 'onUpdate callback threw', {
          err: errText(err)
        })
      }
    }

    const finish = (
      outcome: SessionOutcome,
      summary: string
    ): SessionResult => {
      logger.info('computer', 'session end', { outcome, steps: step, summary })
      emit({ step, outcome })
      return {
        outcome,
        summary,
        steps: step,
        ...(lastShot ? { finalScreenshot: lastShot } : {})
      }
    }

    // --- resolve the target window -----------------------------------------
    let target: TargetWindow
    try {
      target = await race(
        resolveTarget(opts.target, helper),
        signal,
        opTimeoutMs,
        'resolveTarget'
      )
    } catch (err) {
      if (err instanceof AbortedByUser) return finish('aborted', err.message)
      // TargetNotFound (or a timeout) — nothing to drive.
      return finish('failed', errText(err))
    }
    bindTraceAttributes({ targetApp: target.app })

    let cursor: [number, number] | undefined
    let lastActionKind: Action['kind'] | undefined
    let nextHumanNote: string | undefined
    let stuckStreak = 0

    // The askHuman handshake — shared by the model-emitted `askHuman` action and
    // the synthetic stuck prompt. Resolves to the answer, or to a terminal
    // `SessionResult` when the wait is aborted (`aborted`) or times out
    // (`abandoned`). Nothing is executed for the step that asks.
    const awaitHuman = async (
      question: string
    ): Promise<{ answer: string } | SessionResult> => {
      emit({ step, awaitingHuman: { question } })
      try {
        const answer = await race(
          computerAskRegistry.wait(sessionId),
          signal,
          askHumanTimeoutMs,
          'askHuman'
        )
        return { answer }
      } catch (err) {
        if (err instanceof AbortedByUser) return finish('aborted', err.message)
        return finish(
          'abandoned',
          `nobody answered "${question}" within ${askHumanTimeoutMs}ms`
        )
      }
    }

    try {
      for (let s = 1; s <= maxSteps; s++) {
        step = s

        if (signal?.aborted || guard.aborted) {
          return finish('aborted', 'the session was stopped')
        }

        // --- perceive ----------------------------------------------------
        try {
          target = await race(
            refreshBounds(target, helper),
            signal,
            opTimeoutMs,
            'refreshBounds'
          )
        } catch (err) {
          if (err instanceof AbortedByUser) {
            return finish('aborted', err.message)
          }
          // WindowGone (or a timeout) — the target is unusable.
          return finish('failed', errText(err))
        }

        const { shot, scaleFactor } = await race(
          screenshotWindow(target, helper),
          signal,
          opTimeoutMs,
          'screenshotWindow'
        )
        lastShot = shot
        if (!cursor) {
          cursor = [Math.round(shot.width / 2), Math.round(shot.height / 2)]
        }

        // Stuck detection — skipped entirely after a `wait`: a slow page load is
        // several identical frames during a legitimate wait, not a dead loop.
        if (lastActionKind !== 'wait') {
          if (guard.noteFrame(hashPng(shot.data)) === 'stuck') {
            stuckStreak += 1
            if (stuckStreak >= 2) {
              return finish(
                'stuck',
                'Stopped making progress — the screen has not changed across ' +
                  'several steps.'
              )
            }
            logger.info('computer', 'stuck — asking for guidance', { step })
            const res = await awaitHuman(STUCK_QUESTION)
            if ('outcome' in res) return res
            nextHumanNote = res.answer
            continue
          }
          stuckStreak = 0
        }

        // --- think -----------------------------------------------------
        const state: ComputerState = {
          step,
          target: { app: target.app, title: target.title },
          viewport: { width: target.bounds[2], height: target.bounds[3] },
          cursor,
          screenshot: shot,
          ...(nextHumanNote ? { humanNote: nextHumanNote } : {})
        }
        nextHumanNote = undefined

        let action: Action
        try {
          action = await race(
            agent.nextAction(state),
            signal,
            stepTimeoutMs,
            'nextAction'
          )
        } catch (err) {
          if (err instanceof AbortedByUser)
            return finish('aborted', err.message)
          // A timeout, or an agent that threw — either way this episode is done.
          return finish('failed', errText(err))
        }

        logger.info('computer', 'step', { step, action: action.kind })

        if (action.kind === 'done') {
          return finish(action.success ? 'success' : 'failed', action.summary)
        }

        if (action.kind === 'askHuman') {
          const res = await awaitHuman(action.question)
          if ('outcome' in res) return res
          nextHumanNote = res.answer
          continue
        }

        if (action.kind === 'wait') {
          await sleep(action.ms)
          lastActionKind = 'wait'
          emit({ step, action: 'wait', thumbnail: shot.data })
          continue
        }

        // --- act ------------------------------------------------------
        let clamped: Action
        try {
          clamped = guard.check(action, state.viewport)
        } catch (err) {
          if (err instanceof AbortedByUser)
            return finish('aborted', err.message)
          if (err instanceof OutOfBounds) {
            // One wild coordinate is a model slip, not a session-ender — it gets
            // a fresh screenshot next step and can retry.
            logger.warn('computer', 'action out of bounds — skipped', {
              step,
              action: action.kind
            })
            continue
          }
          throw err
        }

        await race(
          hands.execute(clamped, { target, scaleFactor, helper }),
          signal,
          opTimeoutMs,
          'execute'
        )

        if (
          clamped.kind === 'click' ||
          clamped.kind === 'moveMouse' ||
          clamped.kind === 'drag'
        ) {
          cursor = clamped.to
        }
        lastActionKind = clamped.kind
        await sleep(settleMs)
        emit({ step, action: clamped.kind, thumbnail: shot.data })
      }

      return finish('failed', 'reached the step limit without finishing')
    } catch (err) {
      if (err instanceof AbortedByUser) return finish('aborted', err.message)
      return finish('failed', String(err))
    }
  })
}
