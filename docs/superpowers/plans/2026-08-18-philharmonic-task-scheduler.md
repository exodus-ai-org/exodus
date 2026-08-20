# Philharmonic Task Scheduler (Agenda) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Philharmonic users schedule one-off (future-dated) and recurring
(cron) tasks that run inside a Group, and see/manage them from a new
"Schedule" tab on the Dashboard page.

**Architecture:** Add a nullable `runAt` timestamp to the existing `task`
table for one-off scheduling. The existing `node-cron`-backed scheduler
(`scheduler.ts`) gains a once-a-minute sweep that fires due one-off tasks
(no per-task timers — survives restarts). A new route
(`philharmonic-tasks.ts`) exposes the already-existing query-layer task CRUD
over HTTP. The frontend adds an agenda-style tab (Upcoming: grouped-by-day
one-off tasks; Recurring: flat list with next-run time) next to the existing
Cost Analysis tab on the Dashboard page — no calendar-grid library.

**Tech Stack:** Drizzle ORM (PGlite), Hono, Zod, `node-cron` (existing),
`cron-parser` (new — next-run computation), React 19, shadcn/ui
(`Tabs`/`Sheet`/`Select`/`Calendar`/`Badge`), `date-fns` (existing).

**Spec:** `docs/superpowers/specs/2026-08-18-philharmonic-task-scheduler-design.md`

## Global Constraints

- New user-facing copy defaults to English (project-wide rule).
- `cron-parser` is the one new dependency this plan adds — approved in
  brainstorming for computing a recurring task's next-run time
  (`node-cron` has no such API). No other new dependency.
- Test ids are a durable contract: add new `TEST_IDS.schedule.*` entries,
  never rename/reuse existing ones (`lock`, `gallery`, `video`).
- This codebase has **zero** `.test.tsx` files — React components are
  verified via the Playwright checkpoint-linkage pattern + manual testing,
  not Vitest component tests. Follow that convention; do not introduce
  React Testing Library.
- `pnpm format` → `pnpm lint` → `pnpm typecheck` → `pnpm test` must pass
  before every commit (husky pre-commit hook already enforces this).
- Editing an existing scheduled task's cron/runAt is out of scope — the
  PATCH endpoint only supports cancellation (spec's non-goals).

---

### Task 1: Schema — `runAt` column for one-off scheduling

**Files:**

- Modify: `src/main/lib/db/schema.ts:347-374` (the `task` table)
- Generated: `resources/drizzle/000N_*.sql` + `resources/drizzle/meta/_journal.json` + a new snapshot file (via `pnpm db:generate`)
- Test: none — schema-only change, verified by typecheck + the generated migration

**Interfaces:**

- Produces: `task.runAt: timestamp | null` — a nullable column meaning "run this task once at this time". A task is one-off if `runAt` is set, recurring if `cronExpression` is set. Task 2's query functions and Task 4's API schema both depend on this column existing.

- [ ] **Step 1: Add the column**

In `src/main/lib/db/schema.ts`, inside the `task` pgTable definition, add `runAt` right after `cronExpression`:

```ts
export const task = pgTable('task', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  parentTaskId: uuid('parentTaskId'),
  conversationId: uuid('conversationId').references(() => conversation.id, {
    onDelete: 'cascade'
  }),
  title: text('title').notNull(),
  description: text('description').default(''),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  assignedAgentId: uuid('assignedAgentId').references(() => agent.id, {
    onDelete: 'set null'
  }),
  input: jsonb('input').$type<Record<string, unknown>>(),
  output: jsonb('output').$type<Record<string, unknown>>(),
  maxRetries: real('maxRetries').default(1),
  retryCount: real('retryCount').default(0),
  cronExpression: text('cronExpression'),
  runAt: timestamp('runAt'),
  lastRunAt: timestamp('lastRunAt'),
  lastRunStatus: varchar('lastRunStatus').$type<'completed' | 'failed'>(),
  feedbackRating: varchar('feedbackRating').$type<
    'positive' | 'negative' | null
  >(),
  feedbackNote: text('feedbackNote'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt')
})
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`

This creates a new `resources/drizzle/000N_<random-name>.sql` containing
`ALTER TABLE "task" ADD COLUMN "runAt" timestamp;`, and updates
`resources/drizzle/meta/_journal.json` plus a new snapshot JSON. Commit
whatever files drizzle-kit produces alongside the schema change.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck:node`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main/lib/db/schema.ts resources/drizzle/
git commit -m "feat(philharmonic): add task.runAt for one-off scheduling"
```

---

### Task 2: Query layer — upcoming and due one-off tasks

**Files:**

- Modify: `src/main/lib/db/philharmonic-queries.ts`
- Test: `src/main/lib/db/philharmonic-queries.test.ts` (new)

**Interfaces:**

- Consumes: `task.runAt` (Task 1), existing `task` table/`Task` type from `./schema`.
- Produces: `getUpcomingOneOffTasks(): Promise<Task[]>` (pending, `runAt` set, ordered ascending) and `getDueOneOffTasks(): Promise<Task[]>` (pending, one-off, `runAt` in the past). Task 3 (scheduler sweep) consumes `getDueOneOffTasks`. Task 4 (API route) consumes `getUpcomingOneOffTasks`.

- [ ] **Step 1: Write the failing test**

Create `src/main/lib/db/philharmonic-queries.test.ts`:

```ts
// src/main/lib/db/philharmonic-queries.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

let whereArgs: unknown[] = []
let rows: unknown[] = []

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          whereArgs = args
          const result = Promise.resolve(rows) as Promise<unknown[]> & {
            orderBy: (...a: unknown[]) => Promise<unknown[]>
          }
          result.orderBy = () => Promise.resolve(rows)
          return result
        }
      })
    })
  }
}))

const { getUpcomingOneOffTasks, getDueOneOffTasks } =
  await import('./philharmonic-queries')

describe('getUpcomingOneOffTasks', () => {
  beforeEach(() => {
    whereArgs = []
    rows = []
  })

  it('returns rows ordered via the where().orderBy() chain', async () => {
    rows = [{ id: 't1', runAt: new Date('2026-09-01') }]
    const result = await getUpcomingOneOffTasks()
    expect(result).toEqual(rows)
    expect(whereArgs.length).toBeGreaterThan(0)
  })
})

describe('getDueOneOffTasks', () => {
  beforeEach(() => {
    whereArgs = []
    rows = []
  })

  it('returns rows from the where() query', async () => {
    rows = [{ id: 't2', runAt: new Date('2020-01-01') }]
    const result = await getDueOneOffTasks()
    expect(result).toEqual(rows)
    expect(whereArgs.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/lib/db/philharmonic-queries.test.ts`
Expected: FAIL — `getUpcomingOneOffTasks`/`getDueOneOffTasks` are not exported yet.

- [ ] **Step 3: Implement**

In `src/main/lib/db/philharmonic-queries.ts`, add `lte` to the drizzle-orm
import:

```ts
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql
} from 'drizzle-orm'
```

Add these two functions directly after `getCronTasks`:

```ts
/** Pending one-off tasks with a runAt set, soonest first — for the Upcoming list. */
export async function getUpcomingOneOffTasks() {
  return db
    .select()
    .from(task)
    .where(and(eq(task.status, 'pending'), isNotNull(task.runAt)))
    .orderBy(asc(task.runAt))
}

/** Pending one-off tasks whose runAt has passed and haven't fired yet. */
export async function getDueOneOffTasks() {
  return db
    .select()
    .from(task)
    .where(
      and(
        eq(task.status, 'pending'),
        isNull(task.cronExpression),
        isNotNull(task.runAt),
        lte(task.runAt, new Date())
      )
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/main/lib/db/philharmonic-queries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/db/philharmonic-queries.ts src/main/lib/db/philharmonic-queries.test.ts
git commit -m "feat(philharmonic): add upcoming/due one-off task queries"
```

---

### Task 3: Scheduler — one-off sweep

**Files:**

- Modify: `src/main/lib/ai/philharmonic/scheduler.ts`
- Test: `src/main/lib/ai/philharmonic/scheduler.test.ts` (modify)

**Interfaces:**

- Consumes: `getDueOneOffTasks()` (Task 2), existing `runScheduledRound(taskId, emit)`, existing `updateTask(id, data)`.
- Produces: `runDueOneOffTasks(emit: SseEmitter): Promise<void>` — fires every due one-off task once and marks it `completed`. Called by `initScheduler()` immediately on startup and every minute after. No other task depends on this export besides the test.

- [ ] **Step 1: Write the failing test**

Modify `src/main/lib/ai/philharmonic/scheduler.test.ts` to the following
(adds `getDueOneOffTasks` + a named `updateTask` mock, and a new describe
block; `runScheduledRound`'s existing test is unchanged):

```ts
// src/main/lib/ai/philharmonic/scheduler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const runPmCoordinator = vi.fn(async () => {})
const createConversationMessage = vi.fn(async () => ({ id: 'm' }))
const updateTask = vi.fn()
const getDueOneOffTasks = vi.fn(async () => [] as Array<{ id: string }>)
vi.mock('./pm-coordinator', () => ({ runPmCoordinator }))
vi.mock('../../db/conversation-queries', () => ({ createConversationMessage }))
vi.mock('../../db/philharmonic-queries', () => ({
  getCronTasks: async () => [],
  getDueOneOffTasks,
  getTaskById: async () => ({
    id: 't',
    title: 'Daily report',
    conversationId: 'c1',
    status: 'pending'
  }),
  updateTask
}))
vi.mock('node-cron', () => ({
  default: {
    validate: () => true,
    schedule: (_e: string, fn: () => void) => ({ stop: () => {}, _fn: fn })
  }
}))
// Mock logger to avoid pulling in electron / @electron-toolkit/utils
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

const { runScheduledRound, runDueOneOffTasks } = await import('./scheduler')

describe('runScheduledRound', () => {
  beforeEach(() => vi.clearAllMocks())

  it('injects a round-start system message and runs the PM loop', async () => {
    const emit = vi.fn()
    await runScheduledRound('t', emit)
    expect(createConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1', role: 'system' })
    )
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'round_start', conversationId: 'c1' })
    )
    expect(runPmCoordinator).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        userText: expect.stringContaining('Daily report')
      })
    )
  })
})

describe('runDueOneOffTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fires each due task and marks it completed', async () => {
    getDueOneOffTasks.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }])
    await runDueOneOffTasks(vi.fn())
    expect(runPmCoordinator).toHaveBeenCalledTimes(2)
    expect(updateTask).toHaveBeenCalledWith('t1', { status: 'completed' })
    expect(updateTask).toHaveBeenCalledWith('t2', { status: 'completed' })
  })

  it('does nothing when no tasks are due', async () => {
    getDueOneOffTasks.mockResolvedValueOnce([])
    await runDueOneOffTasks(vi.fn())
    expect(runPmCoordinator).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/lib/ai/philharmonic/scheduler.test.ts`
Expected: FAIL — `runDueOneOffTasks` is not exported yet.

- [ ] **Step 3: Implement**

In `src/main/lib/ai/philharmonic/scheduler.ts`, add `getDueOneOffTasks` to
the existing philharmonic-queries import:

```ts
import {
  getCronTasks,
  getDueOneOffTasks,
  getTaskById,
  updateTask
} from '../../db/philharmonic-queries'
```

Add this function after `unscheduleTask` / `getScheduledTaskIds` (before
`initScheduler`):

```ts
/** Fire every due one-off task once, then mark it completed so it never re-fires. */
export async function runDueOneOffTasks(emit: SseEmitter): Promise<void> {
  const due = await getDueOneOffTasks()
  for (const t of due) {
    await runScheduledRound(t.id, emit)
    await updateTask(t.id, { status: 'completed' })
  }
}
```

Replace `initScheduler` with a version that also registers the sweep and
runs it once immediately (so tasks due while the app was closed fire on
startup instead of waiting up to 60s):

```ts
export async function initScheduler(emit: SseEmitter): Promise<void> {
  setSchedulerEmitter(emit)
  const tasks = await getCronTasks()
  let count = 0
  for (const t of tasks) {
    if (t.cronExpression && scheduleTask(t.id, t.cronExpression)) count++
  }
  cron.schedule('* * * * *', () => {
    runDueOneOffTasks(globalEmit).catch((err) =>
      logger.error('scheduler', 'One-off sweep error', { error: String(err) })
    )
  })
  await runDueOneOffTasks(emit).catch((err) =>
    logger.error('scheduler', 'Initial one-off sweep error', {
      error: String(err)
    })
  )
  logger.info('scheduler', 'Initialized', { activeTasks: count })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/main/lib/ai/philharmonic/scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/philharmonic/scheduler.ts src/main/lib/ai/philharmonic/scheduler.test.ts
git commit -m "feat(philharmonic): sweep and fire due one-off scheduled tasks"
```

---

### Task 4: API route — `philharmonic-tasks.ts`

**Files:**

- Create: `src/main/lib/server/routes/philharmonic-tasks.ts`
- Create: `src/main/lib/server/routes/philharmonic-tasks.test.ts`
- Modify: `src/main/lib/server/routes/philharmonic.ts` (mount)

**Interfaces:**

- Consumes: `getUpcomingOneOffTasks`, `getCronTasks`, `createTask`, `updateTask` (`../../db/philharmonic-queries`); `scheduleTask`, `unscheduleTask` (`../../ai/philharmonic/scheduler`, existing exports, unchanged); `getRequiredParam`/`handleDatabaseOperation`/`successResponse`/`validateSchema` (`../utils`).
- Produces: `GET /api/philharmonic/tasks/upcoming`, `GET /api/philharmonic/tasks/recurring`, `POST /api/philharmonic/tasks`, `PATCH /api/philharmonic/tasks/:id` (cancel only). Also exports `scheduleTaskSchema` (a Zod schema) for the test. Task 6 (renderer service) consumes these routes; Task 6 also mirrors the exact request/response shapes below.

Request/response shapes for Task 6 to match:

- `POST /tasks` body: `{ title: string, description?: string, conversationId: string (uuid), priority?: 'low'|'medium'|'high'|'urgent', cronExpression?: string|null, runAt?: string|null (ISO datetime) }` — exactly one of `cronExpression`/`runAt` required. Returns the created row, 201.
- `PATCH /tasks/:id` body: `{ status: 'cancelled' }`. Returns the updated row.

- [ ] **Step 1: Write the failing test**

Create `src/main/lib/server/routes/philharmonic-tasks.test.ts`:

```ts
// src/main/lib/server/routes/philharmonic-tasks.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('../utils', () => ({
  getRequiredParam: (_c: unknown, _k: string) => 'id',
  handleDatabaseOperation: (fn: () => unknown) => fn(),
  successResponse: (_c: unknown, data: unknown) => data,
  validateSchema: (_s: unknown, d: unknown) => d
}))
vi.mock('../../db/philharmonic-queries', () => ({
  createTask: vi.fn(),
  getCronTasks: vi.fn(),
  getUpcomingOneOffTasks: vi.fn(),
  updateTask: vi.fn()
}))
vi.mock('../../ai/philharmonic/scheduler', () => ({
  scheduleTask: vi.fn(),
  unscheduleTask: vi.fn()
}))

const { scheduleTaskSchema } = await import('./philharmonic-tasks')

describe('scheduleTaskSchema', () => {
  const base = {
    title: 'Weekly report',
    conversationId: '11111111-1111-1111-1111-111111111111'
  }

  it('accepts a one-off task with runAt', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      runAt: '2026-09-01T09:00:00.000Z'
    })
    expect(result.success).toBe(true)
  })

  it('accepts a recurring task with cronExpression', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      cronExpression: '0 9 * * 1'
    })
    expect(result.success).toBe(true)
  })

  it('rejects a task with both cronExpression and runAt', () => {
    const result = scheduleTaskSchema.safeParse({
      ...base,
      cronExpression: '0 9 * * 1',
      runAt: '2026-09-01T09:00:00.000Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects a task with neither cronExpression nor runAt', () => {
    const result = scheduleTaskSchema.safeParse(base)
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/lib/server/routes/philharmonic-tasks.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement the route**

Create `src/main/lib/server/routes/philharmonic-tasks.ts`:

```ts
// src/main/lib/server/routes/philharmonic-tasks.ts
import { ErrorCode } from '@shared/constants/error-codes'
import { ValidationError } from '@shared/errors/app-error'
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import cron from 'node-cron'
import { z } from 'zod'

import { scheduleTask, unscheduleTask } from '../../ai/philharmonic/scheduler'
import {
  createTask,
  getCronTasks,
  getUpcomingOneOffTasks,
  updateTask
} from '../../db/philharmonic-queries'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const philharmonicTasks = new Hono<{ Variables: Variables }>()

/** Exactly one of cronExpression/runAt distinguishes recurring vs one-off. */
export const scheduleTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    conversationId: z.string().uuid(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    cronExpression: z.string().optional().nullable(),
    runAt: z.string().datetime().optional().nullable()
  })
  .refine((d) => Boolean(d.cronExpression) !== Boolean(d.runAt), {
    message: 'Exactly one of cronExpression or runAt must be set'
  })

const cancelTaskSchema = z.object({ status: z.literal('cancelled') })

// ─── Scheduled tasks ────────────────────────────────────────────────────────

philharmonicTasks.get('/tasks/upcoming', async (c) =>
  successResponse(
    c,
    await handleDatabaseOperation(
      () => getUpcomingOneOffTasks(),
      'Failed to list upcoming tasks'
    )
  )
)

philharmonicTasks.get('/tasks/recurring', async (c) =>
  successResponse(
    c,
    await handleDatabaseOperation(
      () => getCronTasks(),
      'Failed to list recurring tasks'
    )
  )
)

philharmonicTasks.post('/tasks', async (c) => {
  const data = validateSchema(
    scheduleTaskSchema,
    await c.req.json(),
    'Invalid scheduled task'
  )
  if (data.cronExpression && !cron.validate(data.cronExpression)) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'Invalid cron expression'
    )
  }
  const row = await handleDatabaseOperation(
    () =>
      createTask({
        title: data.title,
        description: data.description,
        conversationId: data.conversationId,
        priority: data.priority,
        cronExpression: data.cronExpression ?? null,
        runAt: data.runAt ? new Date(data.runAt) : null
      }),
    'Failed to create scheduled task'
  )
  if (data.cronExpression) scheduleTask(row.id, data.cronExpression)
  return successResponse(c, row, 201)
})

philharmonicTasks.patch('/tasks/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  validateSchema(cancelTaskSchema, await c.req.json(), 'Invalid task update')
  unscheduleTask(id)
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => updateTask(id, { status: 'cancelled' }),
      'Failed to cancel task'
    )
  )
})

export default philharmonicTasks
```

- [ ] **Step 4: Mount the route**

Read `src/main/lib/server/routes/philharmonic.ts` first to confirm the
exact current import/mount lines, then add `philharmonicTasks` alongside
the other three sub-routers (same pattern as
`philharmonic.route('/', philharmonicCrud)` etc.):

```ts
import philharmonicTasks from './philharmonic-tasks'
```

```ts
philharmonic.route('/', philharmonicTasks)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/main/lib/server/routes/philharmonic-tasks.test.ts`
Expected: PASS

- [ ] **Step 6: Verify typecheck**

Run: `pnpm typecheck:node`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/main/lib/server/routes/philharmonic-tasks.ts src/main/lib/server/routes/philharmonic-tasks.test.ts src/main/lib/server/routes/philharmonic.ts
git commit -m "feat(philharmonic): task scheduling API (upcoming/recurring/create/cancel)"
```

---

### Task 5: Add `cron-parser` dependency

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**

- Produces: `cron-parser`'s `CronExpressionParser` export, available to Task 9 (`recurring-list.tsx`) for computing next-run times.

- [ ] **Step 1: Install**

Run: `pnpm add cron-parser@^5.10.0`

- [ ] **Step 2: Verify**

Run: `node -e "const { CronExpressionParser } = require('cron-parser'); console.log(CronExpressionParser.parse('0 9 * * 1').next().toString())"`
Expected: prints a future date string — confirms the package resolves and the `CronExpressionParser.parse(expr).next()` API works as expected.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add cron-parser for recurring task next-run display"
```

---

### Task 6: Renderer types + service

**Files:**

- Modify: `src/renderer/stores/philharmonic.ts` (add `TaskData`)
- Create: `src/renderer/services/philharmonic-tasks.ts`

**Interfaces:**

- Consumes: response shapes from Task 4's routes.
- Produces: `TaskData` interface and `getUpcomingTasks()`, `getRecurringTasks()`, `createScheduledTask(data)`, `cancelScheduledTask(id)` — consumed by every remaining frontend task.

- [ ] **Step 1: Add the `TaskData` type**

In `src/renderer/stores/philharmonic.ts`, add after `KnowledgeDocData`:

```ts
export interface TaskData {
  id: string
  conversationId: string | null
  title: string
  description: string | null
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'waiting_for_user'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  cronExpression: string | null
  runAt: string | null
  lastRunAt: string | null
  lastRunStatus: 'completed' | 'failed' | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Create the service**

Create `src/renderer/services/philharmonic-tasks.ts`:

```ts
// src/renderer/services/philharmonic-tasks.ts
import { fetcher } from '@shared/utils/http'

import type { TaskData } from '@/stores/philharmonic'

const BASE = '/api/philharmonic'

export const getUpcomingTasks = () =>
  fetcher<TaskData[]>(`${BASE}/tasks/upcoming`)

export const getRecurringTasks = () =>
  fetcher<TaskData[]>(`${BASE}/tasks/recurring`)

export const createScheduledTask = (data: {
  title: string
  description?: string
  conversationId: string
  priority?: TaskData['priority']
  cronExpression?: string | null
  runAt?: string | null
}) =>
  fetcher<TaskData>(`${BASE}/tasks`, { method: 'POST', body: data as never })

export const cancelScheduledTask = (id: string) =>
  fetcher<TaskData>(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: { status: 'cancelled' } as never
  })
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck:web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/stores/philharmonic.ts src/renderer/services/philharmonic-tasks.ts
git commit -m "feat(philharmonic): add TaskData type and task scheduling service"
```

---

### Task 7: Day-grouping helper (pure, unit-tested)

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/group-tasks-by-day.ts`
- Test: `src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts`

**Interfaces:**

- Consumes: `TaskData` (Task 6).
- Produces: `TaskDayGroup { day: Date, label: string, tasks: TaskData[] }` and `groupTasksByDay(tasks: TaskData[]): TaskDayGroup[]`. Assumes input is already sorted by `runAt` ascending (true for `getUpcomingTasks()`'s response). Consumed by Task 9 (`upcoming-list.tsx`).

- [ ] **Step 1: Write the failing test**

Create `src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts`:

```ts
// src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts
import { describe, expect, it } from 'vitest'

import type { TaskData } from '@/stores/philharmonic'

import { groupTasksByDay } from './group-tasks-by-day'

function makeTask(overrides: Partial<TaskData>): TaskData {
  return {
    id: 't1',
    conversationId: 'c1',
    title: 'Task',
    description: null,
    status: 'pending',
    priority: 'medium',
    cronExpression: null,
    runAt: null,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('groupTasksByDay', () => {
  it('groups tasks that fall on the same calendar day', () => {
    const tasks = [
      makeTask({ id: 't1', runAt: '2026-09-01T09:00:00.000Z' }),
      makeTask({ id: 't2', runAt: '2026-09-01T18:00:00.000Z' }),
      makeTask({ id: 't3', runAt: '2026-09-02T09:00:00.000Z' })
    ]
    const groups = groupTasksByDay(tasks)
    expect(groups).toHaveLength(2)
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['t3'])
  })

  it('drops tasks without runAt', () => {
    expect(groupTasksByDay([makeTask({ id: 't1', runAt: null })])).toEqual([])
  })

  it('preserves input order across groups', () => {
    const tasks = [
      makeTask({ id: 't1', runAt: '2026-09-05T09:00:00.000Z' }),
      makeTask({ id: 't2', runAt: '2026-09-01T09:00:00.000Z' })
    ]
    const groups = groupTasksByDay(tasks)
    expect(groups.map((g) => g.tasks[0].id)).toEqual(['t1', 't2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Create `src/renderer/components/philharmonic/schedule/group-tasks-by-day.ts`:

```ts
// src/renderer/components/philharmonic/schedule/group-tasks-by-day.ts
import { format, isSameDay } from 'date-fns'

import type { TaskData } from '@/stores/philharmonic'

export interface TaskDayGroup {
  day: Date
  label: string
  tasks: TaskData[]
}

/**
 * Groups one-off tasks by the calendar day of their `runAt`. Tasks without
 * `runAt` are dropped. Assumes `tasks` is already sorted by `runAt` ascending
 * (true for `getUpcomingTasks()`'s response) — groups come out in that order.
 */
export function groupTasksByDay(tasks: TaskData[]): TaskDayGroup[] {
  const groups: TaskDayGroup[] = []
  for (const t of tasks) {
    if (!t.runAt) continue
    const day = new Date(t.runAt)
    const existing = groups.find((g) => isSameDay(g.day, day))
    if (existing) {
      existing.tasks.push(t)
    } else {
      groups.push({ day, label: format(day, 'EEE, MMM d'), tasks: [t] })
    }
  }
  return groups
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/group-tasks-by-day.ts src/renderer/components/philharmonic/schedule/group-tasks-by-day.test.ts
git commit -m "feat(philharmonic): add day-grouping helper for the schedule agenda"
```

---

### Task 8: `TaskCard` component

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/task-card.tsx`

**Interfaces:**

- Consumes: `TaskData` (Task 6); shadcn `Badge`, `Button` (existing, unchanged).
- Produces: `<TaskCard task groupTitle subtitle onCancel cancelling />`. Consumed by Task 9 and Task 10. Its root and cancel button get `data-testid` attributes retrofitted in Task 13 (registry ids land in the same commit as their application + test reference, per the project's linkage-test rule — see Task 13).

- [ ] **Step 1: Implement**

Create `src/renderer/components/philharmonic/schedule/task-card.tsx`:

```tsx
// src/renderer/components/philharmonic/schedule/task-card.tsx
import { Loader2Icon, XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TaskData } from '@/stores/philharmonic'

const STATUS_LABEL: Record<TaskData['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  waiting_for_user: 'Waiting'
}

const PRIORITY_LABEL: Record<TaskData['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

export function TaskCard({
  task,
  groupTitle,
  subtitle,
  onCancel,
  cancelling
}: {
  task: TaskData
  groupTitle: string
  /** Recurring: cron expression + next-run text. One-off: time of day. */
  subtitle: string
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const cancellable = task.status === 'pending'
  return (
    <div className="flex items-start justify-between gap-3 rounded-(--ph-radius-lg) border border-(--ph-border) bg-(--ph-surface) p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-(--ph-text)">
            {task.title}
          </span>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          <Badge
            variant={task.status === 'failed' ? 'destructive' : 'secondary'}
            className="shrink-0 text-[10px]"
          >
            {STATUS_LABEL[task.status]}
          </Badge>
        </div>
        <div className="mt-1 truncate text-xs text-(--ph-text-muted)">
          {groupTitle} · {subtitle}
        </div>
      </div>
      {cancellable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-(--ph-text-muted) hover:text-(--ph-danger)"
          disabled={cancelling}
          onClick={() => onCancel(task.id)}
          aria-label="Cancel scheduled task"
        >
          {cancelling ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/task-card.tsx
git commit -m "feat(philharmonic): add TaskCard for the schedule agenda"
```

---

### Task 9: `UpcomingList` component

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/upcoming-list.tsx`

**Interfaces:**

- Consumes: `groupTasksByDay` (Task 7), `TaskCard` (Task 8), `TaskData`/`ConversationData` (existing + Task 6), shadcn `ScrollArea` (existing).
- Produces: `<UpcomingList tasks conversationsById cancellingId onCancel />`. Consumed by Task 12 (`schedule-tab.tsx`).

- [ ] **Step 1: Implement**

Create `src/renderer/components/philharmonic/schedule/upcoming-list.tsx`:

```tsx
// src/renderer/components/philharmonic/schedule/upcoming-list.tsx
import { format } from 'date-fns'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { groupTasksByDay } from './group-tasks-by-day'
import { TaskCard } from './task-card'

export function UpcomingList({
  tasks,
  conversationsById,
  cancellingId,
  onCancel
}: {
  tasks: TaskData[]
  conversationsById: Record<string, ConversationData>
  cancellingId: string | null
  onCancel: (id: string) => void
}) {
  const groups = groupTasksByDay(tasks)

  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-(--ph-text-muted)">
        No upcoming one-off tasks. Schedule one to see it here.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {groups.map((group) => (
          <div key={group.day.toISOString()}>
            <div className="sticky top-0 z-10 mb-2 bg-(--ph-surface) py-1 text-xs font-semibold text-(--ph-text-muted)">
              {group.label}
            </div>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  groupTitle={
                    conversationsById[task.conversationId ?? '']?.title ??
                    'Unknown group'
                  }
                  subtitle={format(new Date(task.runAt!), 'HH:mm')}
                  onCancel={onCancel}
                  cancelling={cancellingId === task.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/upcoming-list.tsx
git commit -m "feat(philharmonic): add UpcomingList to the schedule agenda"
```

---

### Task 10: `RecurringList` component

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/recurring-list.tsx`

**Interfaces:**

- Consumes: `TaskCard` (Task 8), `CronExpressionParser` from `cron-parser` (Task 5).
- Produces: `<RecurringList tasks conversationsById cancellingId onCancel />`. Consumed by Task 12.

- [ ] **Step 1: Implement**

Create `src/renderer/components/philharmonic/schedule/recurring-list.tsx`:

```tsx
// src/renderer/components/philharmonic/schedule/recurring-list.tsx
import { CronExpressionParser } from 'cron-parser'
import { format } from 'date-fns'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { TaskCard } from './task-card'

function describeSchedule(task: TaskData): string {
  if (!task.cronExpression) return ''
  try {
    const next = CronExpressionParser.parse(task.cronExpression).next().toDate()
    return `${task.cronExpression} · next ${format(next, 'MMM d, HH:mm')}`
  } catch {
    return task.cronExpression
  }
}

export function RecurringList({
  tasks,
  conversationsById,
  cancellingId,
  onCancel
}: {
  tasks: TaskData[]
  conversationsById: Record<string, ConversationData>
  cancellingId: string | null
  onCancel: (id: string) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-(--ph-text-muted)">
        No recurring tasks yet.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            groupTitle={
              conversationsById[task.conversationId ?? '']?.title ??
              'Unknown group'
            }
            subtitle={describeSchedule(task)}
            onCancel={onCancel}
            cancelling={cancellingId === task.id}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/recurring-list.tsx
git commit -m "feat(philharmonic): add RecurringList to the schedule agenda"
```

---

### Task 11: `ScheduleTaskForm` component

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/schedule-task-form.tsx`

**Interfaces:**

- Consumes: `createScheduledTask` (Task 6), shadcn `Sheet`/`Select`/`Calendar`/`Popover`/`Input`/`Textarea`/`Label`/`Button` (existing), `sileo` toast (existing dependency, used elsewhere in Philharmonic).
- Produces: `<ScheduleTaskForm open onOpenChange conversations onCreated />`. Consumed by Task 12.

- [ ] **Step 1: Implement**

Create `src/renderer/components/philharmonic/schedule/schedule-task-form.tsx`:

```tsx
// src/renderer/components/philharmonic/schedule/schedule-task-form.tsx
import { useState } from 'react'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createScheduledTask } from '@/services/philharmonic-tasks'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

const CRON_PRESETS = [
  { label: 'Every day at 9:00 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1' },
  { label: 'Custom', value: 'custom' }
]

export function ScheduleTaskForm({
  open,
  onOpenChange,
  conversations,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: ConversationData[]
  onCreated: (task: TaskData) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [mode, setMode] = useState<'once' | 'recurring'>('once')
  const [runAtDate, setRunAtDate] = useState<Date | undefined>(undefined)
  const [runAtTime, setRunAtTime] = useState('09:00')
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[0].value)
  const [customCron, setCustomCron] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setTitle('')
    setDescription('')
    setConversationId('')
    setMode('once')
    setRunAtDate(undefined)
    setRunAtTime('09:00')
    setCronPreset(CRON_PRESETS[0].value)
    setCustomCron('')
  }

  const handleSubmit = async () => {
    if (!title.trim() || !conversationId) return
    let cronExpression: string | null = null
    let runAt: string | null = null
    if (mode === 'recurring') {
      cronExpression = cronPreset === 'custom' ? customCron.trim() : cronPreset
      if (!cronExpression) return
    } else {
      if (!runAtDate) return
      const [hours, minutes] = runAtTime.split(':').map(Number)
      const combined = new Date(runAtDate)
      combined.setHours(hours, minutes, 0, 0)
      runAt = combined.toISOString()
    }
    setSubmitting(true)
    try {
      const task = await createScheduledTask({
        title: title.trim(),
        description: description.trim() || undefined,
        conversationId,
        cronExpression,
        runAt
      })
      onCreated(task)
      reset()
      onOpenChange(false)
      sileo.success({ title: 'Task scheduled' })
    } catch (err) {
      sileo.error({
        title: 'Could not schedule task',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Schedule a task</SheetTitle>
          <SheetDescription>
            Runs inside an existing Group, once or on a recurring schedule.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-title">Title</Label>
            <Input
              id="schedule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly status report"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-description">Description</Label>
            <Textarea
              id="schedule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should the team do?"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Group</Label>
            <Select value={conversationId} onValueChange={setConversationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {conversations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'once' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('once')}
            >
              One-off
            </Button>
            <Button
              type="button"
              variant={mode === 'recurring' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('recurring')}
            >
              Recurring
            </Button>
          </div>
          {mode === 'once' ? (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    {runAtDate ? runAtDate.toDateString() : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={runAtDate}
                    onSelect={setRunAtDate}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={runAtTime}
                onChange={(e) => setRunAtTime(e.target.value)}
                className="w-28"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Select value={cronPreset} onValueChange={setCronPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cronPreset === 'custom' && (
                <Input
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 9 * * 1-5"
                />
              )}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button
            type="button"
            disabled={submitting || !title.trim() || !conversationId}
            onClick={handleSubmit}
          >
            {submitting ? 'Scheduling…' : 'Schedule task'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/schedule-task-form.tsx
git commit -m "feat(philharmonic): add ScheduleTaskForm (one-off + recurring create)"
```

---

### Task 12: `ScheduleTab` component

**Files:**

- Create: `src/renderer/components/philharmonic/schedule/schedule-tab.tsx`

**Interfaces:**

- Consumes: `UpcomingList` (Task 9), `RecurringList` (Task 10), `ScheduleTaskForm` (Task 11), `getUpcomingTasks`/`getRecurringTasks`/`cancelScheduledTask` (Task 6), shadcn `Tabs`/`Button` (existing).
- Produces: `<ScheduleTab conversations />`, plus its "Schedule task" button (`onClick={() => setFormOpen(true)}`) gets a `data-testid` retrofitted in Task 13. Consumed by Task 13 (`philharmonic.tsx` dashboard wiring).

- [ ] **Step 1: Implement**

Create `src/renderer/components/philharmonic/schedule/schedule-tab.tsx`:

```tsx
// src/renderer/components/philharmonic/schedule/schedule-tab.tsx
import { PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  cancelScheduledTask,
  getRecurringTasks,
  getUpcomingTasks
} from '@/services/philharmonic-tasks'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { RecurringList } from './recurring-list'
import { ScheduleTaskForm } from './schedule-task-form'
import { UpcomingList } from './upcoming-list'

export function ScheduleTab({
  conversations
}: {
  conversations: ConversationData[]
}) {
  const [upcoming, setUpcoming] = useState<TaskData[]>([])
  const [recurring, setRecurring] = useState<TaskData[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    getUpcomingTasks().then(setUpcoming)
    getRecurringTasks().then(setRecurring)
  }, [])

  const conversationsById = useMemo(
    () => Object.fromEntries(conversations.map((c) => [c.id, c])),
    [conversations]
  )

  const handleCreated = useCallback((task: TaskData) => {
    if (task.cronExpression) setRecurring((p) => [task, ...p])
    else setUpcoming((p) => [...p, task])
  }, [])

  const handleCancel = useCallback(async (id: string) => {
    setCancellingId(id)
    try {
      await cancelScheduledTask(id)
      setUpcoming((p) => p.filter((t) => t.id !== id))
      setRecurring((p) => p.filter((t) => t.id !== id))
      sileo.success({ title: 'Task cancelled' })
    } catch (err) {
      sileo.error({
        title: 'Could not cancel task',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setCancellingId(null)
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-(--ph-border) px-4 py-3">
        <span className="text-sm font-semibold text-(--ph-text)">Schedule</span>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Schedule task
        </Button>
      </div>
      <Tabs defaultValue="upcoming" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 w-fit shrink-0">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="min-h-0 flex-1">
          <UpcomingList
            tasks={upcoming}
            conversationsById={conversationsById}
            cancellingId={cancellingId}
            onCancel={handleCancel}
          />
        </TabsContent>
        <TabsContent value="recurring" className="min-h-0 flex-1">
          <RecurringList
            tasks={recurring}
            conversationsById={conversationsById}
            cancellingId={cancellingId}
            onCancel={handleCancel}
          />
        </TabsContent>
      </Tabs>
      <ScheduleTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        conversations={conversations}
        onCreated={handleCreated}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/philharmonic/schedule/schedule-tab.tsx
git commit -m "feat(philharmonic): add ScheduleTab composing the agenda + create form"
```

---

### Task 13: Test ids, Dashboard wiring, e2e checkpoint, CLAUDE.md

The project's linkage test (`test-ids.linkage.test.ts`) requires every
registry id to be declared, applied in `src/renderer`, AND referenced by a
test — all at once, or `pnpm test` (part of the pre-commit gate) fails.
This task is the only place `TEST_IDS.schedule.*` gets declared, so it also
retrofits the two `data-testid` attributes into the already-built
`task-card.tsx` (Task 8) and `schedule-tab.tsx` (Task 12), and adds the e2e
spec that references all four ids — landing declare + apply + reference in
one commit.

**Files:**

- Modify: `src/shared/constants/test-ids.ts` (registry)
- Modify: `src/renderer/components/philharmonic/schedule/task-card.tsx` (add 2 `data-testid`s)
- Modify: `src/renderer/components/philharmonic/schedule/schedule-tab.tsx` (add 1 `data-testid`)
- Modify: `src/renderer/containers/philharmonic.tsx` (Dashboard Tabs + 1 `data-testid`)
- Create: `tests/e2e/philharmonic-schedule.spec.ts`
- Modify: `CLAUDE.md` (Philharmonic section + Code Structure)

**Interfaces:**

- Consumes: `ScheduleTab` (Task 12), `CostAnalysis` (existing), `TaskCard` (Task 8, edited in place).
- Produces: the `dashboard` page now shows a Costs/Schedule `Tabs`; nothing downstream depends on this task.

- [ ] **Step 1: Add the test id registry entries**

In `src/shared/constants/test-ids.ts`, add a new top-level key after
`video`:

```ts
  video: {
    card: 'video.card'
  },
  schedule: {
    tab: 'schedule.tab',
    createButton: 'schedule.create-button',
    taskCard: 'schedule.task-card',
    cancelButton: 'schedule.cancel-button'
  }
```

- [ ] **Step 2: Retrofit `data-testid` into `task-card.tsx`**

In `src/renderer/components/philharmonic/schedule/task-card.tsx`, add the
import:

```tsx
import { TEST_IDS } from '@shared/constants/test-ids'
```

Change the root `<div>` to:

```tsx
    <div
      data-testid={TEST_IDS.schedule.taskCard}
      className="flex items-start justify-between gap-3 rounded-(--ph-radius-lg) border border-(--ph-border) bg-(--ph-surface) p-3"
    >
```

Add `data-testid={TEST_IDS.schedule.cancelButton}` as the first prop on the
`<Button>` inside `{cancellable && (...)}`.

- [ ] **Step 3: Retrofit `data-testid` into `schedule-tab.tsx`**

In `src/renderer/components/philharmonic/schedule/schedule-tab.tsx`, add
the import:

```tsx
import { TEST_IDS } from '@shared/constants/test-ids'
```

Change the "Schedule task" button to:

```tsx
        <Button
          data-testid={TEST_IDS.schedule.createButton}
          type="button"
          size="sm"
          onClick={() => setFormOpen(true)}
        >
```

- [ ] **Step 4: Wire the Dashboard tabs**

Read `src/renderer/containers/philharmonic.tsx` first to confirm current
line numbers, then:

Add imports:

```tsx
import { TEST_IDS } from '@shared/constants/test-ids'
```

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

Add a lazy import next to the existing `CostAnalysis` one:

```tsx
const ScheduleTab = lazy(() =>
  import('@/components/philharmonic/schedule/schedule-tab').then((m) => ({
    default: m.ScheduleTab
  }))
)
```

Replace the `dashboard` branch inside `mainContent`'s IIFE:

```tsx
if (activePage === 'dashboard')
  return (
    <Tabs defaultValue="costs" className="flex h-full min-h-0 flex-col">
      <TabsList className="mx-4 mt-3 w-fit shrink-0">
        <TabsTrigger value="costs">Costs</TabsTrigger>
        <TabsTrigger value="schedule" data-testid={TEST_IDS.schedule.tab}>
          Schedule
        </TabsTrigger>
      </TabsList>
      <TabsContent value="costs" className="min-h-0 flex-1">
        <Suspense fallback={null}>
          <CostAnalysis />
        </Suspense>
      </TabsContent>
      <TabsContent value="schedule" className="min-h-0 flex-1">
        <Suspense fallback={null}>
          <ScheduleTab conversations={conversations} />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
```

(`conversations` is already in scope — it's `PhilharmonicContainer`'s
existing state.)

- [ ] **Step 5: Add the e2e checkpoint spec**

Create `tests/e2e/philharmonic-schedule.spec.ts`, following the same
pattern as `tests/e2e/web-search-gallery.spec.ts` (checkpoint ids that hold
whether or not the Schedule tab has been opened / has data — a fresh test
profile has no Groups or scheduled tasks, and there's no existing e2e
coverage of navigating into Philharmonic to build on):

```ts
// tests/e2e/philharmonic-schedule.spec.ts
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The Schedule tab only renders once a user opens a Group's Dashboard page,
// and task cards depend on non-deterministic seeded data. These assertions
// reference the schedule checkpoints so the linkage test passes; they hold
// whether or not the tab has been opened yet.
test('philharmonic schedule checkpoints are addressable', async ({
  mainWindow
}) => {
  for (const id of [
    TEST_IDS.schedule.tab,
    TEST_IDS.schedule.createButton,
    TEST_IDS.schedule.taskCard,
    TEST_IDS.schedule.cancelButton
  ]) {
    expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
  }
})
```

- [ ] **Step 6: Update CLAUDE.md**

In the "Philharmonic (multi-agent Groups)" section, add a bullet after
"Each Group gets an isolated workspace...":

```markdown
- Scheduled tasks (`task.cronExpression` for recurring, `task.runAt` for
  one-off) run via `src/main/lib/ai/philharmonic/scheduler.ts`
  (per-task `node-cron` jobs + a once-a-minute sweep for one-off tasks);
  managed from the Schedule tab on the Dashboard page
  (`components/philharmonic/schedule/`)
```

In the "Code Structure" → Renderer list, add after the `components/philharmonic/`
line:

```markdown
- `src/renderer/components/philharmonic/schedule/` — Schedule tab (agenda: upcoming one-off + recurring tasks)
```

- [ ] **Step 7: Run the full verification suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass — this is the commit where `TEST_IDS.schedule.*` is
declared, applied (Steps 2–4), and referenced by the new e2e spec (Step 5)
all at once, so `test-ids.linkage.test.ts` passes.

- [ ] **Step 8: Commit**

```bash
git add src/shared/constants/test-ids.ts src/renderer/components/philharmonic/schedule/task-card.tsx src/renderer/components/philharmonic/schedule/schedule-tab.tsx src/renderer/containers/philharmonic.tsx tests/e2e/philharmonic-schedule.spec.ts CLAUDE.md
git commit -m "feat(philharmonic): wire Schedule tab into Dashboard + test ids + docs"
```

---

## Manual verification (after all tasks)

1. `pnpm dev`, open Philharmonic, create a Group if none exists.
2. Navigate to Dashboard → Schedule tab (visible next to Costs).
3. Click "Schedule task", create a one-off task ~2 minutes in the future for
   that Group. Confirm it appears under Upcoming, grouped under today's date
   header.
4. Wait for it to fire (sweep runs every minute). Confirm a `[Scheduled]`
   system message appears in the Group's chat, and the task disappears from
   Upcoming (now `completed`).
5. Create a recurring task (e.g. "Every day at 9:00 AM"). Confirm it shows
   under Recurring with a computed next-run time.
6. Cancel both a pending one-off task and the recurring task; confirm they
   disappear from their lists and (for the recurring one) don't fire again.
7. Restart the app with a due one-off task still pending; confirm it fires
   on startup rather than waiting for the next minute tick.
