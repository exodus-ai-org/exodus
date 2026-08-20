# Philharmonic Task Scheduler (Agenda) — Design

Date: 2026-08-18
Status: Approved (design), pending implementation plan

## Summary

Philharmonic already persists scheduled work in the `task` table
(`cronExpression` for recurring tasks) and runs recurring tasks via a
`node-cron`-backed scheduler (`src/main/lib/ai/philharmonic/scheduler.ts`).
There is no support for **one-off, future-dated** tasks, no HTTP surface for
task CRUD (the DB query layer exists in `philharmonic-queries.ts` but is never
routed), and no UI to see or manage any of it.

This adds one-off scheduling to the data model + scheduler, exposes a task API,
and adds an **agenda-style** list view (not a full calendar grid — see
rejected approaches below) as a new tab on the existing Philharmonic dashboard
page, next to `CostAnalysis`.

## Goals

- Users can schedule a task to run once at a future time, or recurringly via
  cron, from a new Schedule tab.
- The tab shows two sections: **Upcoming** (one-off tasks, grouped by day) and
  **Recurring** (active cron tasks, each showing last-run and next-run time).
- Users can cancel a scheduled task (one-off or recurring) from the list.
- Scheduling survives app restarts (no in-memory-only timers for one-off
  tasks).

## Non-goals

- Full day/week/month calendar grid (MUI-X-Scheduler-style). Rejected in
  brainstorming: this app's task volume is agenda-shaped (mostly a handful of
  recurring templates + occasional one-offs), not dense enough to need grid
  navigation, and a grid would pull in a much heavier component (either a
  large headless calendar dependency, or a lot of custom grid/drag logic) for
  a view nobody asked for. Revisit only if usage patterns prove it's needed.
- Visual cron builder (day/hour pickers, etc). A cron task is created via a
  small preset list (daily / weekly) or a raw cron-expression text field,
  validated server-side with the existing `cron.validate()` check.
- Editing a task's Group/conversation after creation, or reassigning the
  agent from the schedule tab (use the existing chat/team UI for that).
- Task history/execution detail (that's `task_execution` /
  `task_execution_event`, already surfaced elsewhere or out of scope here).

## Data model

`src/main/lib/db/schema.ts`, `task` table: add one nullable column.

```ts
runAt: timestamp('runAt'), // one-off scheduled execution time
```

A task is "scheduled" if `cronExpression` is set (recurring) **or** `runAt` is
set (one-off). These are mutually exclusive — enforced at the API validation
layer, not the DB (matches how the rest of this schema handles invariants).

Run `pnpm db:generate` after the schema edit to produce the migration.

### Query layer (`src/main/lib/db/philharmonic-queries.ts`)

Add, next to the existing Task CRUD section:

```ts
/** Pending one-off tasks with a future or past-due runAt, for the Upcoming list */
export async function getUpcomingOneOffTasks() { ... }
// where status = 'pending' AND runAt IS NOT NULL, order by runAt asc

/** Pending one-off tasks whose runAt has passed and haven't fired yet */
export async function getDueOneOffTasks() { ... }
// where status = 'pending' AND runAt <= now() AND cronExpression IS NULL
```

`getCronTasks()` (already exists) is reused as-is for the Recurring section's
data source.

## Backend: one-off scheduling

`src/main/lib/ai/philharmonic/scheduler.ts` currently only handles recurring
cron jobs (one `ScheduledTask` per task, keyed in `scheduledJobs`). One-off
tasks are **not** given individual timers (a `setTimeout` per task would not
survive an app restart and would need its own bookkeeping to cancel/reconcile).
Instead:

- Add a single **sweep job**, itself a `node-cron` schedule (`* * * * *`,
  once a minute), registered in `initScheduler()` alongside the existing
  per-task cron jobs.
- The sweep calls `getDueOneOffTasks()`, and for each due task: calls the
  existing `runScheduledRound(taskId, emit)`, then additionally sets
  `status: 'completed'` (one-off tasks don't re-fire, unlike recurring
  templates — this is the one behavioral difference from the existing
  `runScheduledRound` completion handling, which currently only touches
  `lastRunStatus`).
- `initScheduler()` runs the sweep once immediately (not just on the minute
  boundary) so tasks that came due while the app was closed fire on startup
  instead of waiting up to 60s.

No new dependency for this part — `node-cron` already handles the sweep
cadence.

## API layer

New route file `src/main/lib/server/routes/philharmonic-tasks.ts`, mounted in
`philharmonic.ts` next to `philharmonicCrud`/`philharmonicSse`/
`philharmonicConversations` (`philharmonic.route('/', philharmonicTasks)`).
Follows the existing `philharmonic-crud.ts` conventions
(`successResponse`/`handleDatabaseOperation`/`validateSchema`/
`getRequiredParam` from `../utils`).

```
GET   /tasks/upcoming        → getUpcomingOneOffTasks()
GET   /tasks/recurring       → getCronTasks()
POST  /tasks                 → createTask() (validated below)
PATCH /tasks/:id             → updateTask() (partial; used for cancel + edit)
```

Create schema — exactly one of `cronExpression`/`runAt`, and a `conversationId`
is required (a scheduled task always runs inside an existing Group, same as
`runScheduledRound` already assumes):

```ts
const scheduleTaskSchema = z
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
```

`POST /tasks` calls `createTask()`, and if `cronExpression` was set, also
calls `scheduleTask(task.id, cronExpression)` so it's picked up immediately
without waiting for the next `initScheduler()` (app restart).

`PATCH /tasks/:id` with `{ status: 'cancelled' }` is how the UI cancels a
task; for recurring tasks this also calls `unscheduleTask(id)`.

Renderer service: `src/renderer/services/philharmonic-tasks.ts`, thin
wrappers over `fetcher()` mirroring `services/philharmonic.ts`'s shape
(`getUpcomingTasks`, `getRecurringTasks`, `createScheduledTask`,
`cancelTask`).

## Frontend

### Dashboard tab restructuring

`src/renderer/containers/philharmonic.tsx` — the `dashboard` branch of
`mainContent` currently renders `<CostAnalysis />` directly. Wrap it in a
shadcn `Tabs` with two panels, both lazy-loaded (dashboard is already an
opt-in, non-default page):

- **Costs** — existing `CostAnalysis`, unchanged.
- **Schedule** — new `ScheduleTab`, receives the already-fetched
  `conversations` list as a prop (for the create form's Group picker — avoids
  a duplicate fetch).

### `src/renderer/components/philharmonic/schedule/`

- **`schedule-tab.tsx`** — top-level tab content: fetches upcoming +
  recurring lists (SWR), renders the two sections, owns the create-task
  Sheet's open state.
- **`upcoming-list.tsx`** — groups `getUpcomingOneOffTasks()` results by
  calendar day (`date-fns`'s `isSameDay`/`format`), sticky day headers,
  one `TaskCard` per task.
- **`recurring-list.tsx`** — flat list from `getCronTasks()`; each row shows
  the cron expression, last-run time, and **next-run time** computed via
  `cron-parser` (see dependency note below).
- **`task-card.tsx`** — shared card: title, Group name, priority `Badge`,
  status `Badge`, a cancel button (confirmation via existing toast pattern,
  not a separate dialog).
- **`schedule-task-form.tsx`** — create form in a shadcn `Sheet`: title,
  description, Group `Select`, one-off/recurring toggle, then either a
  shadcn `Calendar` + time input (one-off `runAt`) or a preset `Select`
  (daily/weekly) + optional raw cron text field (recurring).

No calendar-grid or drag-drop library. `date-fns` (existing dependency)
covers all the day-grouping/formatting needed for an agenda list.

### New dependency: `cron-parser`

Showing "next run" for a recurring task needs computing the next fire time
from a cron expression — `node-cron` doesn't expose this. `cron-parser` is
small, zero-dependency, MIT-licensed, and widely used for exactly this.
Approved in brainstorming. Used only in `recurring-list.tsx`
(`parseExpression(cronExpression).next().toDate()`).

## Test-ids & tests

Registry additions to `src/shared/constants/test-ids.ts`:

```ts
schedule: {
  tab: 'schedule.tab',
  createButton: 'schedule.create-button',
  taskCard: 'schedule.task-card',
  cancelButton: 'schedule.cancel-button'
}
```

Applied on the dashboard's Schedule `TabsTrigger`, the create-task button in
`schedule-tab.tsx`, each `task-card.tsx` root, and its cancel button.
Referenced from a Playwright spec under `tests/e2e/` (new
`philharmonic-schedule.spec.ts`, following the existing e2e fixture
patterns).

Unit tests:

- `getUpcomingOneOffTasks` / `getDueOneOffTasks` query filters.
- Scheduler sweep: due task fires exactly once, gets marked `completed`,
  past-due tasks fire on `initScheduler()` without waiting for the minute
  tick (extends the existing `scheduler.test.ts` mock setup).
- `philharmonic-tasks.ts` route: create validation (exactly one of
  cron/runAt), cancel unscheduling a recurring task.
- Day-grouping helper in `upcoming-list.tsx` (pure function, extracted for
  testability — same pattern as `collect-gallery-videos.ts`).

Test file placement follows whatever convention the separate test-directory
reorganization (in progress) lands on; if that lands first, new tests for
this feature go straight into the new structure, otherwise they're
co-located for now and become part of that migration's scope.

## Error handling / edge cases

- Cancelling a recurring task calls `unscheduleTask()` — future firings stop
  even though the row stays in the DB (existing pattern, unchanged).
- A one-off task whose `runAt` is in the past when created is valid (fires on
  the next sweep tick, effectively "run ASAP").
- Deleting a Group that has scheduled tasks: `task.conversationId` already
  cascades on delete (existing FK), so its tasks are removed too — no new
  handling needed, but worth a test.
- Invalid cron expression: rejected at `POST /tasks` time via the existing
  `cron.validate()` check (reused from `scheduleTask()`), not just at fire
  time.

## Testing / verification

- `pnpm test` — new unit tests above, plus `test-ids.linkage.test.ts` picking
  up the new registry entries.
- `pnpm typecheck` + `pnpm lint` clean.
- Manual: create a one-off task 2 minutes out, confirm it appears under
  Upcoming, fires and disappears (moves to completed) after the sweep;
  create a recurring task, confirm it shows next-run time and fires on
  schedule; cancel both, confirm they stop firing.

## Docs

CLAUDE.md's Philharmonic section gets a one-off/recurring scheduling mention
and its Code Structure listing gets the new
`components/philharmonic/schedule/` directory and `philharmonic-tasks.ts`
route file, per the project's "keep this file current" constraint.

## Out of scope / future

- Full calendar grid view.
- Drag-to-reschedule.
- Editing an existing task's schedule (currently: cancel + recreate).
- Push/desktop notifications on task completion (separate concern).
