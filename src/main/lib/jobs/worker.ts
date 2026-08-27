import cron from 'node-cron'

import { logger } from '../logger'
import { handlers } from './handlers'
import { archiveMessage, enqueueJob, readBatch } from './queries'
import { QUEUE_NAMES, type QueueName } from './types'

/**
 * Deliberately generous: it must exceed the slowest realistic handler runtime,
 * or the periodic sweep re-reads a message that is still being processed and
 * runs its handler a second time concurrently (`lcm-post-turn`'s
 * `compactAfterTurn` can run up to 10 rounds of LLM summarization and routinely
 * outlives a 30-second window). It costs nothing in the happy path —
 * `enqueueAndProcess`'s immediate kick already handles low-latency processing,
 * so this value only governs crash-recovery timing.
 */
const VISIBILITY_TIMEOUT_SECONDS = 300
const BATCH_SIZE = 5
const MAX_READ_COUNT = 5

/**
 * Reads and processes one batch from a queue. Errors are isolated per
 * message: a handler throwing logs the error and leaves the message alone
 * (pgmq's visibility timeout makes it available again for retry), unless
 * it has already been read `MAX_READ_COUNT` times, in which case it's
 * archived anyway so a permanently-broken payload doesn't retry forever.
 *
 * Known limitation — not every job type can actually trigger this
 * retry/give-up logic, because three of the four handlers in `./handlers`
 * wrap functions that catch and log their own errors internally and never
 * rethrow:
 *
 * - `index-message` — full retry-on-failure. `elasticsearch.indexMessage`
 *   errors propagate, so a real failure is retried up to `MAX_READ_COUNT`
 *   times before being given up on.
 * - `lcm-post-turn` — half-and-half. `trackNewMessages` can throw and
 *   propagate (full retry-on-failure for that half), but `compactAfterTurn`
 *   swallows its own errors internally (best-effort only for that half) —
 *   see `LcmManager.compactAfterTurn` in `../ai/context-management`.
 * - `memory-write-judge` — best-effort only. `runMemoryWriteJudge` catches
 *   and logs its own errors and never rethrows, so this handler always
 *   resolves regardless of whether the judge actually ran successfully.
 * - `session-summary` — best-effort only, same reasoning: `saveSessionSummary`
 *   never rethrows.
 *
 * This is a deliberate, accepted tradeoff (ruled on during the job-queue
 * decoupling plan's review), not an oversight: the old fire-and-forget code
 * had identical silent-failure behavior for these job types, and changing
 * `runMemoryWriteJudge`/`saveSessionSummary`/`compactAfterTurn`'s error
 * handling is explicitly out of scope for that plan. The queue still adds
 * real value for these jobs via durability across process restarts — it's
 * only the retry-on-logged-failure behavior that doesn't apply to them.
 */
export async function processQueue(queueName: QueueName): Promise<void> {
  const messages = await readBatch(
    queueName,
    VISIBILITY_TIMEOUT_SECONDS,
    BATCH_SIZE
  )

  for (const msg of messages) {
    try {
      await handlers[queueName](msg.message)
      await archiveMessage(queueName, msg.msgId)
    } catch (error) {
      logger.error('jobs', `Job handler failed for ${queueName}`, {
        msgId: msg.msgId,
        readCt: msg.readCt,
        error: String(error)
      })
      if (msg.readCt >= MAX_READ_COUNT) {
        logger.error(
          'jobs',
          `Giving up on ${queueName} job after ${msg.readCt} attempts`,
          { msgId: msg.msgId }
        )
        // Guarded: an unhandled rejection here would propagate out of
        // `processQueue` and skip every remaining message in the batch, not
        // just this one.
        await archiveMessage(queueName, msg.msgId).catch((archiveError) => {
          logger.error('jobs', `Failed to archive gave-up ${queueName} job`, {
            msgId: msg.msgId,
            error: String(archiveError)
          })
        })
      }
    }
  }
}

/**
 * Enqueues a job, then fires an immediate (non-blocking) processing
 * attempt so the common case has near-zero latency instead of waiting for
 * the next periodic sweep. The returned promise resolves once the job is
 * durably enqueued — it does not wait for processing to finish.
 */
export async function enqueueAndProcess(
  queueName: QueueName,
  payload: unknown
): Promise<void> {
  await enqueueJob(queueName, payload)
  processQueue(queueName).catch((error) => {
    logger.error('jobs', `Immediate processing kick failed for ${queueName}`, {
      error: String(error)
    })
  })
}

/**
 * Shared `.catch` reporter for `enqueueAndProcess` call sites.
 *
 * Deliberately logs neither `error.message` nor the payload: a Drizzle
 * `DrizzleQueryError`'s message embeds the failing query *and its bound
 * parameters*, and job payloads carry `apiKey` (three of the four queues) and
 * full message content (`index-message`) — all of which would otherwise land in
 * plaintext in `~/.exodus/logs/*.jsonl`. `error.name` alone is safe and still
 * distinguishes error types.
 */
export function logEnqueueFailure(queueName: QueueName, error: unknown): void {
  logger.error('jobs', `Failed to enqueue ${queueName} job`, {
    queueName,
    errorName: error instanceof Error ? error.name : typeof error
  })
}

/**
 * Periodic safety-net sweep — catches anything the immediate kick in
 * `enqueueAndProcess` missed (e.g. a process restart between enqueue and
 * the kick completing). Each queue's sweep failure is isolated from the
 * others.
 */
export function initJobQueue(): void {
  cron.schedule('*/15 * * * * *', () => {
    for (const queueName of QUEUE_NAMES) {
      processQueue(queueName).catch((error) => {
        logger.error('jobs', `Sweep failed for ${queueName}`, {
          error: String(error)
        })
      })
    }
  })
}
