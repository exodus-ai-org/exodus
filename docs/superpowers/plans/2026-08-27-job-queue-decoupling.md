# Job Queue Decoupling (pgmq) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move chat.ts's four post-turn side effects (Elasticsearch indexing,
LCM tracking/compaction, memory-write judge, session summary) off ad hoc
in-request fire-and-forget blocks onto durable `pgmq` queues, so a process
restart mid-flight no longer silently drops queued work.

**Architecture:** PGlite's `pgmq` extension (SQL-native message queue, no
background worker) backs four named queues, one per job type. A small
worker module reads batches, dispatches to per-type handlers that wrap the
existing (unmodified) LCM/memory/search logic, and archives on success —
visibility timeout handles retry automatically, capped by `read_ct` to
avoid infinite loops on a permanently-broken job.

**Tech Stack:** `@electric-sql/pglite-pgmq`, `node-cron` (already a
dependency), Drizzle's raw `sql` template via `db.execute()`.

**Spec:** `docs/superpowers/specs/2026-08-27-job-queue-decoupling-design.md`

## Global Constraints

- Job payloads must be plain JSON — no live object references (a queued
  job may run in a later tick or after a restart).
- Preserve the exact existing behavior of each of the four jobs — this is
  a relocation of when/how they run, not a rewrite of what they do.
- Per-job isolation: one handler throwing must never affect another job,
  another job type, or a future chat turn.
- `pnpm format` → `pnpm lint` → `pnpm typecheck` → `pnpm test` must pass
  before every commit (husky pre-commit hook).
- If the pre-commit hook fails specifically on an "Unhandled Rejection:
  RuntimeError: Aborted()" from `context-management/index.test.ts` (a
  known flaky PGlite WASM teardown crash, documented in this repo's
  CLAUDE.md) where the real test counts still show all passing — retry
  the commit. Never use `git commit --no-verify`.
- `db.execute(sql\`...\`)`on this repo's PGlite/Drizzle setup returns`{ rows: [...] }`, not a plain array — normalize with
`(result as unknown as { rows: unknown[] }).rows ?? result`, matching
the existing pattern in `src/main/lib/db/conversation-queries.ts:41-42`.

---

### Task 1: pgmq extension registration + queue primitives

**Files:**

- Modify: `src/main/lib/db/db.ts`
- Modify: `src/main/lib/db/migrate.ts`
- Modify: `package.json` (new dependency)
- Create: `src/main/lib/jobs/types.ts`
- Create: `src/main/lib/jobs/queries.ts`
- Test: `tests/unit/main/lib/jobs/queries.test.ts`

**Interfaces:**

- Produces: `QueueName` type, `QUEUE_NAMES: QueueName[]`
  (`src/main/lib/jobs/types.ts`) — consumed by every later task.
- Produces: `JobMessage { msgId: number; readCt: number; message: unknown }`
  (`src/main/lib/jobs/types.ts`).
- Produces: `enqueueJob(queueName: QueueName, payload: unknown): Promise<void>`,
  `readBatch(queueName: QueueName, vt: number, qty: number): Promise<JobMessage[]>`,
  `archiveMessage(queueName: QueueName, msgId: number): Promise<void>`
  (`src/main/lib/jobs/queries.ts`) — consumed by Task 3.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add @electric-sql/pglite-pgmq`

- [ ] **Step 2: Register the pgmq extension on the PGlite client**

In `src/main/lib/db/db.ts`, currently:

```ts
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'

import { getDatabaseDir } from '../paths'

const dbPath = getDatabaseDir()
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector }
})

export const db = drizzle(pglite)
```

Change to:

```ts
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { pgmq } from '@electric-sql/pglite-pgmq'
import { drizzle } from 'drizzle-orm/pglite'

import { getDatabaseDir } from '../paths'

const dbPath = getDatabaseDir()
export const pglite = new PGlite({
  dataDir: dbPath,
  extensions: { vector, pgmq }
})

export const db = drizzle(pglite)
```

- [ ] **Step 3: Create the extension and the four queues at migration time**

In `src/main/lib/db/migrate.ts`, currently:

```ts
    await pglite.waitReady
    await pglite.exec('CREATE EXTENSION IF NOT EXISTS vector;')
    await migrate(db, {
```

Change to:

```ts
    await pglite.waitReady
    await pglite.exec('CREATE EXTENSION IF NOT EXISTS vector;')
    await pglite.exec('CREATE EXTENSION IF NOT EXISTS pgmq;')
    for (const queueName of QUEUE_NAMES) {
      try {
        await pglite.exec(`SELECT pgmq.create('${queueName}');`)
      } catch {
        // Queue already exists from a previous run — pgmq.create is not
        // guaranteed idempotent across versions, so tolerate the error
        // rather than checking existence first.
      }
    }
    await migrate(db, {
```

Add the import at the top of the file:

```ts
import { QUEUE_NAMES } from '../jobs/types'
```

(`queueName` here is always one of the four hardcoded `QUEUE_NAMES`
constants defined in Step 4 below, never user input, so the string
interpolation into raw SQL is safe.)

- [ ] **Step 4: Define the queue names**

Create `src/main/lib/jobs/types.ts`:

```ts
export type QueueName =
  | 'index-message'
  | 'lcm-post-turn'
  | 'memory-write-judge'
  | 'session-summary'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-write-judge',
  'session-summary'
]

export interface JobMessage {
  msgId: number
  readCt: number
  message: unknown
}
```

- [ ] **Step 5: Write the failing tests for the query primitives**

Create `tests/unit/main/lib/jobs/queries.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/db', () => ({ db: { execute: vi.fn() } }))

const { db } = await import('@main/lib/db/db')
const { enqueueJob, readBatch, archiveMessage } =
  await import('@main/lib/jobs/queries')

describe('enqueueJob', () => {
  it('calls db.execute once and resolves', async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as never)
    await expect(
      enqueueJob('index-message', { id: 'msg-1' })
    ).resolves.toBeUndefined()
    expect(db.execute).toHaveBeenCalledTimes(1)
  })
})

describe('readBatch', () => {
  it('maps snake_case pgmq columns to camelCase JobMessage fields', async () => {
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        { msg_id: 7, read_ct: 2, message: { id: 'msg-1' } },
        { msg_id: 8, read_ct: 0, message: { id: 'msg-2' } }
      ]
    } as never)

    const result = await readBatch('index-message', 30, 5)

    expect(result).toEqual([
      { msgId: 7, readCt: 2, message: { id: 'msg-1' } },
      { msgId: 8, readCt: 0, message: { id: 'msg-2' } }
    ])
  })

  it('returns an empty array when there are no messages', async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as never)
    const result = await readBatch('index-message', 30, 5)
    expect(result).toEqual([])
  })
})

describe('archiveMessage', () => {
  it('calls db.execute once and resolves', async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as never)
    await expect(archiveMessage('index-message', 7)).resolves.toBeUndefined()
    expect(db.execute).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `pnpm test tests/unit/main/lib/jobs/queries.test.ts`
Expected: FAIL — `Cannot find module '@main/lib/jobs/queries'`

- [ ] **Step 7: Implement the query primitives**

Create `src/main/lib/jobs/queries.ts`:

```ts
import { sql } from 'drizzle-orm'

import { db } from '../db/db'
import type { JobMessage, QueueName } from './types'

export async function enqueueJob(
  queueName: QueueName,
  payload: unknown
): Promise<void> {
  await db.execute(
    sql`SELECT * FROM pgmq.send(${queueName}, ${JSON.stringify(payload)}::jsonb)`
  )
}

interface PgmqReadRow {
  msg_id: number
  read_ct: number
  message: unknown
}

export async function readBatch(
  queueName: QueueName,
  vt: number,
  qty: number
): Promise<JobMessage[]> {
  const result = await db.execute(
    sql`SELECT msg_id, read_ct, message FROM pgmq.read(${queueName}, ${vt}, ${qty})`
  )
  const rows = (result as unknown as { rows: PgmqReadRow[] }).rows ?? []
  return rows.map((row) => ({
    msgId: Number(row.msg_id),
    readCt: Number(row.read_ct),
    message: row.message
  }))
}

export async function archiveMessage(
  queueName: QueueName,
  msgId: number
): Promise<void> {
  await db.execute(sql`SELECT pgmq.archive(${queueName}, ${msgId})`)
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm test tests/unit/main/lib/jobs/queries.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: Verify the migration path against a real (dev) database**

Run: `pnpm dev` if you're able to in this environment (check for a port
conflict with any other running instance of this app first — if you
cannot start it, skip this step and note it in your report; Tasks 2-4
don't depend on having actually run this). If you can run it, check the
main-process log output for migration success and confirm no error is
thrown around the `pgmq` extension/queue-creation lines added in Step 3.

- [ ] **Step 10: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add package.json pnpm-lock.yaml src/main/lib/db/db.ts src/main/lib/db/migrate.ts src/main/lib/jobs/types.ts src/main/lib/jobs/queries.ts tests/unit/main/lib/jobs/queries.test.ts
git commit -m "feat(jobs): register pgmq extension and add queue primitives"
```

---

### Task 2: Job handlers

**Files:**

- Create: `src/main/lib/jobs/handlers.ts`
- Test: `tests/unit/main/lib/jobs/handlers.test.ts`

**Interfaces:**

- Consumes: `QueueName` (Task 1).
- Produces: `handlers: Record<QueueName, (payload: unknown) => Promise<void>>`
  (`src/main/lib/jobs/handlers.ts`) — consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/main/lib/jobs/handlers.test.ts`:

```ts
import type { Model } from '@mariozechner/pi-ai'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))

const mockGetSettings = vi.fn()
vi.mock('@main/lib/db/queries', () => ({ getSettings: mockGetSettings }))

const mockElasticsearchIndexMessage = vi.fn()
const mockResolveSearchProvider = vi.fn()
vi.mock('@main/lib/search/resolve-search-provider', () => ({
  resolveSearchProvider: mockResolveSearchProvider
}))

const mockTrackNewMessages = vi.fn()
const mockCompactAfterTurn = vi.fn()
vi.mock('@main/lib/ai/context-management', () => ({
  LcmManager: vi.fn().mockImplementation(() => ({
    trackNewMessages: mockTrackNewMessages,
    compactAfterTurn: mockCompactAfterTurn
  }))
}))

const mockRunMemoryWriteJudge = vi.fn()
const mockSaveSessionSummary = vi.fn()
vi.mock('@main/lib/ai/memory/manager', () => ({
  runMemoryWriteJudge: mockRunMemoryWriteJudge,
  saveSessionSummary: mockSaveSessionSummary
}))

const { handlers } = await import('@main/lib/jobs/handlers')

const fakeModel = { id: 'gpt-4.1-mini' } as unknown as Model<string>

describe('handlers.index-message', () => {
  it('does nothing when elasticsearch is not configured', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockResolveSearchProvider.mockReturnValue({ elasticsearch: null })

    await handlers['index-message']({
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'hello',
      createdAt: new Date()
    })

    expect(mockElasticsearchIndexMessage).not.toHaveBeenCalled()
  })

  it('indexes the message with searchText computed when elasticsearch is configured', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockResolveSearchProvider.mockReturnValue({
      elasticsearch: { indexMessage: mockElasticsearchIndexMessage }
    })
    mockElasticsearchIndexMessage.mockResolvedValue(undefined)

    await handlers['index-message']({
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'hello',
      createdAt: new Date('2026-01-01')
    })

    expect(mockElasticsearchIndexMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg-1',
        chatId: 'chat-1',
        searchText: 'hello'
      })
    )
  })
})

describe('handlers.lcm-post-turn', () => {
  it('constructs an LcmManager and tracks then compacts', async () => {
    mockTrackNewMessages.mockResolvedValue(undefined)
    mockCompactAfterTurn.mockResolvedValue(undefined)

    await handlers['lcm-post-turn']({
      chatId: 'chat-1',
      chatModel: fakeModel,
      apiKey: 'key',
      freshTailSize: 16,
      contextWindowPercent: 75,
      newMessages: [{ id: 'msg-1', content: 'hi' }]
    })

    expect(mockTrackNewMessages).toHaveBeenCalledWith([
      { id: 'msg-1', content: 'hi' }
    ])
    expect(mockCompactAfterTurn).toHaveBeenCalledTimes(1)
  })
})

describe('handlers.memory-write-judge', () => {
  it('calls runMemoryWriteJudge with the payload fields', async () => {
    mockRunMemoryWriteJudge.mockResolvedValue(undefined)

    await handlers['memory-write-judge']({
      messages: [{ role: 'user', content: 'hi' }],
      chatModel: fakeModel,
      apiKey: 'key'
    })

    expect(mockRunMemoryWriteJudge).toHaveBeenCalledWith(
      [{ role: 'user', content: 'hi' }],
      fakeModel,
      'key'
    )
  })
})

describe('handlers.session-summary', () => {
  it('calls saveSessionSummary with the payload fields', async () => {
    mockSaveSessionSummary.mockResolvedValue(undefined)

    await handlers['session-summary']({
      chatId: 'chat-1',
      messages: [{ role: 'user', content: 'hi' }],
      chatModel: fakeModel,
      apiKey: 'key'
    })

    expect(mockSaveSessionSummary).toHaveBeenCalledWith(
      'chat-1',
      [{ role: 'user', content: 'hi' }],
      fakeModel,
      'key'
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/unit/main/lib/jobs/handlers.test.ts`
Expected: FAIL — `Cannot find module '@main/lib/jobs/handlers'`

- [ ] **Step 3: Implement the handlers**

Create `src/main/lib/jobs/handlers.ts`:

```ts
import type { Message, Model } from '@mariozechner/pi-ai'

import { LcmManager } from '../ai/context-management'
import { runMemoryWriteJudge, saveSessionSummary } from '../ai/memory/manager'
import { getSettings } from '../db/queries'
import { extractSearchableText } from '../search/extract-searchable-text'
import { resolveSearchProvider } from '../search/resolve-search-provider'
import type { QueueName } from './types'

interface IndexMessagePayload {
  id: string
  chatId: string
  role: string
  content: unknown
  createdAt: Date
}

interface LcmPostTurnPayload {
  chatId: string
  chatModel: Model<string>
  apiKey: string
  freshTailSize: number
  contextWindowPercent: number
  newMessages: Array<{ id: string; content: unknown }>
}

interface MemoryWriteJudgePayload {
  messages: Array<{ role: string; content: unknown }>
  chatModel: Model<string>
  apiKey: string
}

interface SessionSummaryPayload {
  chatId: string
  messages: Array<{ role: string; content: unknown }>
  chatModel: Model<string>
  apiKey: string
}

export const handlers: Record<QueueName, (payload: unknown) => Promise<void>> =
  {
    'index-message': async (payload) => {
      const row = payload as IndexMessagePayload
      const settings = await getSettings()
      const { elasticsearch } = resolveSearchProvider(settings)
      if (!elasticsearch) return
      const message = {
        ...row,
        searchText: extractSearchableText(row)
      } as Message & { id: string; chatId: string; createdAt: Date }
      await elasticsearch.indexMessage(message)
    },

    'lcm-post-turn': async (payload) => {
      const p = payload as LcmPostTurnPayload
      const lcm = new LcmManager(p.chatId, p.chatModel, p.apiKey, {
        freshTailSize: p.freshTailSize,
        contextWindowPercent: p.contextWindowPercent
      })
      await lcm.trackNewMessages(p.newMessages)
      await lcm.compactAfterTurn()
    },

    'memory-write-judge': async (payload) => {
      const p = payload as MemoryWriteJudgePayload
      await runMemoryWriteJudge(p.messages, p.chatModel, p.apiKey)
    },

    'session-summary': async (payload) => {
      const p = payload as SessionSummaryPayload
      await saveSessionSummary(p.chatId, p.messages, p.chatModel, p.apiKey)
    }
  }
```

Note: `compactAfterTurn()` already catches and logs its own errors
internally (see `src/main/lib/ai/context-management/index.ts`'s
`compactAfterTurn` method) — awaiting it directly here is safe and matches
existing behavior; it will not throw into this handler.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test tests/unit/main/lib/jobs/handlers.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/main/lib/jobs/handlers.ts tests/unit/main/lib/jobs/handlers.test.ts
git commit -m "feat(jobs): add per-queue job handlers wrapping existing logic"
```

---

### Task 3: Worker loop + app wiring

**Files:**

- Create: `src/main/lib/jobs/worker.ts`
- Modify: `src/main/lib/server/app.ts`
- Test: `tests/unit/main/lib/jobs/worker.test.ts`

**Interfaces:**

- Consumes: `readBatch`, `archiveMessage`, `enqueueJob` (Task 1),
  `handlers` (Task 2).
- Produces: `processQueue(queueName: QueueName): Promise<void>`,
  `enqueueAndProcess(queueName: QueueName, payload: unknown): Promise<void>`,
  `initJobQueue(): void` — `enqueueAndProcess` is consumed by Task 4;
  `initJobQueue` is consumed by `app.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/main/lib/jobs/worker.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

const mockReadBatch = vi.fn()
const mockArchiveMessage = vi.fn()
const mockEnqueueJob = vi.fn()
vi.mock('@main/lib/jobs/queries', () => ({
  readBatch: mockReadBatch,
  archiveMessage: mockArchiveMessage,
  enqueueJob: mockEnqueueJob
}))

const mockIndexMessageHandler = vi.fn()
vi.mock('@main/lib/jobs/handlers', () => ({
  handlers: {
    'index-message': mockIndexMessageHandler,
    'lcm-post-turn': vi.fn(),
    'memory-write-judge': vi.fn(),
    'session-summary': vi.fn()
  }
}))

vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() }
}))

const { processQueue, enqueueAndProcess } =
  await import('@main/lib/jobs/worker')

describe('processQueue', () => {
  it('archives a message after its handler succeeds', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 1, readCt: 0, message: { id: 'msg-1' } }
    ])
    mockIndexMessageHandler.mockResolvedValue(undefined)

    await processQueue('index-message')

    expect(mockIndexMessageHandler).toHaveBeenCalledWith({ id: 'msg-1' })
    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 1)
  })

  it('leaves a failed message alone for retry when under the attempt cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 2, readCt: 1, message: { id: 'msg-2' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))
    mockArchiveMessage.mockClear()

    await processQueue('index-message')

    expect(mockArchiveMessage).not.toHaveBeenCalled()
  })

  it('archives a failed message once it exceeds the attempt cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 3, readCt: 5, message: { id: 'msg-3' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))
    mockArchiveMessage.mockClear()

    await processQueue('index-message')

    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 3)
  })

  it('processes an empty batch without error', async () => {
    mockReadBatch.mockResolvedValueOnce([])
    await expect(processQueue('index-message')).resolves.toBeUndefined()
  })
})

describe('enqueueAndProcess', () => {
  it('enqueues the job and resolves without waiting for processing', async () => {
    mockEnqueueJob.mockResolvedValue(undefined)
    mockReadBatch.mockResolvedValueOnce([])

    await expect(
      enqueueAndProcess('index-message', { id: 'msg-1' })
    ).resolves.toBeUndefined()

    expect(mockEnqueueJob).toHaveBeenCalledWith('index-message', {
      id: 'msg-1'
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/unit/main/lib/jobs/worker.test.ts`
Expected: FAIL — `Cannot find module '@main/lib/jobs/worker'`

- [ ] **Step 3: Implement the worker**

Create `src/main/lib/jobs/worker.ts`:

```ts
import cron from 'node-cron'

import { logger } from '../logger'
import { handlers } from './handlers'
import { archiveMessage, enqueueJob, readBatch } from './queries'
import { QUEUE_NAMES, type QueueName } from './types'

const VISIBILITY_TIMEOUT_SECONDS = 30
const BATCH_SIZE = 5
const MAX_READ_COUNT = 5

/**
 * Reads and processes one batch from a queue. Errors are isolated per
 * message: a handler throwing logs the error and leaves the message alone
 * (pgmq's visibility timeout makes it available again for retry), unless
 * it has already been read `MAX_READ_COUNT` times, in which case it's
 * archived anyway so a permanently-broken payload doesn't retry forever.
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
        await archiveMessage(queueName, msg.msgId)
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test tests/unit/main/lib/jobs/worker.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Wire `initJobQueue` into the server**

In `src/main/lib/server/app.ts`, add the import alongside the existing
scheduler import (line 8):

```ts
import { initScheduler } from '../ai/philharmonic/scheduler'
import { initJobQueue } from '../jobs/worker'
```

Then find (around lines 94-99):

```ts
      logger.info('server', 'Hono is running', { port: SERVER_PORT })

      // Initialize cron scheduler after server is up
      initScheduler(emitToAll).catch((err) =>
        logger.error('scheduler', 'Init error', { error: String(err) })
      )
    }
```

Change to:

```ts
      logger.info('server', 'Hono is running', { port: SERVER_PORT })

      // Initialize cron scheduler after server is up
      initScheduler(emitToAll).catch((err) =>
        logger.error('scheduler', 'Init error', { error: String(err) })
      )
      initJobQueue()
    }
```

(`initJobQueue()` is synchronous — it only calls `cron.schedule(...)`,
which registers the recurring task and returns immediately, so it needs
no `.catch()` of its own. Any error during actual queue processing is
already caught and logged inside `processQueue`/`enqueueAndProcess`.)

- [ ] **Step 6: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/main/lib/jobs/worker.ts src/main/lib/server/app.ts tests/unit/main/lib/jobs/worker.test.ts
git commit -m "feat(jobs): add worker loop with retry/give-up and wire into app startup"
```

---

### Task 4: Rewire chat.ts onto the job queue

**Files:**

- Modify: `src/main/lib/server/routes/chat.ts`
- Delete: `src/main/lib/search/index-messages-in-background.ts`
- Test: existing `tests/api/chat-history.spec.ts` and
  `tests/api/search-elasticsearch.spec.ts` serve as the regression check
  (no new test file for this task — see Step 5)

**Interfaces:**

- Consumes: `enqueueAndProcess` (Task 3).

- [ ] **Step 1: Replace the pre-chat index call**

In `src/main/lib/server/routes/chat.ts`, find (around line 166):

```ts
indexMessagesInBackground([toDbRow(userMessage, id)], c.get('settings'))
```

Replace with:

```ts
enqueueAndProcess('index-message', toDbRow(userMessage, id)).catch((error) => {
  logger.error('jobs', 'Failed to enqueue index-message job', {
    error: String(error)
  })
})
```

- [ ] **Step 2: Replace the post-chat index call**

Find (around lines 456-461):

```ts
// Persist new messages to DB
if (newMessages.length > 0) {
  const rows = newMessages.map((m) => toDbRow(m, id))
  await saveMessages({ messages: rows })
  indexMessagesInBackground(rows, c.get('settings'))
}
```

Replace with:

```ts
// Persist new messages to DB
if (newMessages.length > 0) {
  const rows = newMessages.map((m) => toDbRow(m, id))
  await saveMessages({ messages: rows })
  for (const row of rows) {
    enqueueAndProcess('index-message', row).catch((error) => {
      logger.error('jobs', 'Failed to enqueue index-message job', {
        error: String(error)
      })
    })
  }
}
```

- [ ] **Step 3: Replace the entire POST-CHAT block**

Find the whole block (around lines 463-514):

```ts
// ── POST-CHAT: async memory operations (non-blocking) ──────────────
if (newMessages.length > 0) {
  const allSavedMessages = [...allMessages, ...newMessages]
  Promise.resolve()
    .then(async () => {
      // LCM: track new messages and compact — reuse pre-chat instance
      if (lcm) {
        await lcm.trackNewMessages(
          newMessages.map((m) => ({ id: m.id, content: m.content }))
        )
        lcm.compactAfterTurn().catch((err) => {
          logger.error('chat', 'LCM compactAfterTurn failed', {
            error: String(err)
          })
        })
      }

      // Memory write judge + session summary — gated on memoryAutoWrite
      if (memoryAutoWrite) {
        runMemoryWriteJudge(
          allSavedMessages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          chatModel,
          apiKey
        ).catch((err) => {
          logger.error('chat', 'Memory write judge failed', {
            error: String(err)
          })
        })
        saveSessionSummary(
          id,
          allSavedMessages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          chatModel,
          apiKey
        ).catch((err) => {
          logger.error('chat', 'Session summary failed', {
            error: String(err)
          })
        })
      }
    })
    .catch((err) => {
      logger.error('chat', 'Post-response operation failed', {
        error: String(err)
      })
    })
}
```

Replace with:

```ts
// ── POST-CHAT: enqueue background jobs (non-blocking) ───────────────
if (newMessages.length > 0) {
  const allSavedMessages = [...allMessages, ...newMessages]

  if (lcm) {
    enqueueAndProcess('lcm-post-turn', {
      chatId: id,
      chatModel,
      apiKey,
      freshTailSize: memoryConfig?.freshTailSize ?? 16,
      contextWindowPercent: memoryConfig?.contextWindowPercent ?? 75,
      newMessages: newMessages.map((m) => ({
        id: m.id,
        content: m.content
      }))
    }).catch((error) => {
      logger.error('jobs', 'Failed to enqueue lcm-post-turn job', {
        error: String(error)
      })
    })
  }

  if (memoryAutoWrite) {
    const summaryMessages = allSavedMessages.map((m) => ({
      role: m.role,
      content: m.content
    }))
    enqueueAndProcess('memory-write-judge', {
      messages: summaryMessages,
      chatModel,
      apiKey
    }).catch((error) => {
      logger.error('jobs', 'Failed to enqueue memory-write-judge job', {
        error: String(error)
      })
    })
    enqueueAndProcess('session-summary', {
      chatId: id,
      messages: summaryMessages,
      chatModel,
      apiKey
    }).catch((error) => {
      logger.error('jobs', 'Failed to enqueue session-summary job', {
        error: String(error)
      })
    })
  }
}
```

- [ ] **Step 4: Update imports**

Remove (no longer used in this file):

```ts
import { indexMessagesInBackground } from '../../search/index-messages-in-background'
```

Remove `runMemoryWriteJudge` and `saveSessionSummary` from the
`'../../ai/memory/manager'` import if nothing else in the file still uses
them directly (check with
`grep -n "runMemoryWriteJudge\|saveSessionSummary" src/main/lib/server/routes/chat.ts`
after Step 3 — they should now have zero remaining references in this
file, since both moved into `handlers.ts`).

Add:

```ts
import { enqueueAndProcess } from '../../jobs/worker'
```

- [ ] **Step 5: Delete the now-obsolete helper**

```bash
rm src/main/lib/search/index-messages-in-background.ts
rm tests/unit/main/lib/search/index-messages-in-background.test.ts 2>/dev/null || true
```

Check whether a test file for it exists first
(`find tests -iname "*index-messages-in-background*"`) — the plan this
file originated from did not create one, but confirm before assuming.

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors. In particular, confirm nothing else in the codebase
still imports `indexMessagesInBackground`
(`grep -rn "indexMessagesInBackground" src/`) — should return zero
results after this task.

- [ ] **Step 7: Run the existing regression tests**

This task's real correctness check is that the existing Elasticsearch and
PGlite search tests still pass now that indexing goes through the queue
instead of a direct fire-and-forget call:

Run: `pnpm test tests/api/chat-history.spec.ts tests/api/search-elasticsearch.spec.ts`

Expected: PASS. `chat-history.spec.ts`'s search test exercises the PGlite
path, which is untouched by this task (searchText is still computed
synchronously inside `saveMessages`) — it must still pass. If you have
`OPENAI_API_KEY` and cannot reach a live Elasticsearch cluster, the second
file's tests will skip (gated on `ELASTIC_URL`) rather than fail — that's
expected in this environment; note it in your report rather than treating
skipped as passed if you can't distinguish them from the output.

If a live Elasticsearch cluster IS reachable in your environment when you
run this: `search-elasticsearch.spec.ts` polls for up to 10 seconds
waiting for a message to become searchable
(`tests/api/search-elasticsearch.spec.ts`'s `expect.poll(..., { timeout:
10_000 })`). With the immediate processing kick in `enqueueAndProcess`,
indexing should still happen well within that window — but if you see
this test start flaking specifically after this task's changes, that's a
real regression to investigate (likely means the immediate kick isn't
firing before the poll gives up), not something to paper over by raising
the timeout without understanding why.

- [ ] **Step 8: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/main/lib/server/routes/chat.ts
git rm src/main/lib/search/index-messages-in-background.ts
git commit -m "feat(jobs): rewire chat.ts post-turn side effects onto the job queue"
```
