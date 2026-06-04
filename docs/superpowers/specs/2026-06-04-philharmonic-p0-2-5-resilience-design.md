# Philharmonic P0-2.5 — Background-safe, notifications, retry, toasts

**Date:** 2026-06-04
**Status:** Approved, executing
**Scope:** Four small, related additions that make long-running Groups feel reliable:

1. Background-safe rejoin (user closes the Group panel, comes back, picks up state)
2. Native notifications on completion and failure
3. Decorrelated-jitter retry for transient employee-loop failures
4. Toast errors at the app shell, parallel to the inline error block in Chat

These all hang off P0-2's plan state; none change schema.

## Goal

A Group is a long-lived background unit. After P0-2.5 you can hand a Group a slow task, close the chat panel, work on something else, and come back to find:

- The plan reflects what actually happened while you were away.
- Transient API failures didn't kill the run — the employee loop retried.
- macOS / Linux / Windows fired a system notification when the work finished (or when the PM failed).
- Errors are visible everywhere via toast, not just inside the Chat scroll.

## Decisions

- **DB is replay source.** Renderer doesn't try to buffer "missed SSE events" — on mount or revision bump, it re-pulls the plan + messages from REST. SSE drives incremental updates; REST handles cold catch-up.
- **Notifications only when the BrowserWindow is unfocused.** Showing a native notification while the user is actively in the app is annoying. We check `mainWindow.isFocused()` before firing.
- **Retry only on transient errors, never on user abort.** Auth errors, validation errors, and `AbortSignal` aborts pass through immediately. Network errors (ETIMEDOUT/ECONNRESET), HTTP 429, HTTP 5xx, and common "rate limit" / "overloaded" message patterns retry up to `task.maxRetries`.
- **Decorrelated Jitter for backoff.** `sleep = min(cap, random_uniform(base, prev_sleep * 3))` with base=1000ms, cap=30000ms. Better average throughput than classic exp+jitter under shared backends; ref AWS Architecture Blog "Exponential Backoff And Jitter".
- **Toast = sileo at the app shell.** Existing workforce surfaces already use `sileo`; we add a tiny layer that listens to `conversation_error` events and fires a sileo error toast tagged with the conversation title.

## Out of scope

- Persisting `conversation_error` as a dedicated event row (today the PM also writes a system message inside `conversation_message` when it errors out — already enough for replay).
- Granular notification preferences (per-Group mute, quiet hours). For v1 it's a single global on/off; we'll wire a settings toggle later if needed.
- Reconnect indicator UI ("Catching up…"). The transition is fast enough not to need one.

## Pieces

### 1. Background-safe rejoin (mostly verifying existing behavior)

`useConversationStream` already calls `getActivePlan` on mount/conversation switch. The Chat component already refetches `getConversationMessages` when `revision` ticks. So:

- ✅ Plan state survives a panel close (REST refresh on mount)
- ✅ Persisted messages survive (refetch on revision tick triggered by next event)
- ✅ Tool execution events persist in `task_execution_event` (already)
- ✅ PM error path persists a system message via `createConversationMessage` (already)

Only fix needed: when `useConversationStream` mounts mid-flight (active plan with `running` steps), make sure the plan re-fetch happens after we've replaced the EventSource — otherwise the initial REST pull can land before a fast SSE update and get clobbered. Easy: pull on every mount, accept that fast updates win.

### 2. Native notifications

New module `src/main/lib/philharmonic-notifications.ts`:

```ts
export function notifyIfBackground(opts: { title: string; body: string }): void
```

Caller checks: if main window exists and is NOT focused, fire `new Notification({title, body, silent: false}).show()`. Otherwise no-op.

Called from `pm-coordinator.ts`:

- On `plan_status_changed → completed`: title = `Group "{conversationTitle}" finished`, body = plan summary
- On caught PM error: title = `Group "{conversationTitle}" hit an error`, body = first 120 chars of the error

We pass the conversation title down — it's already loaded at the start of `runPmCoordinator` (or we fetch via `getConversationById`).

### 3. Retry with Decorrelated Jitter

New module `src/main/lib/ai/philharmonic/retry.ts`:

```ts
export interface RetryPolicy {
  baseMs: number
  capMs: number
  maxAttempts: number
}
export const DEFAULT_POLICY: RetryPolicy
export function isTransientError(err: unknown): boolean
export function nextDelayMs(prevMs: number, p: RetryPolicy): number
export async function withRetry<T>(
  task: () => Promise<T>,
  opts: {
    policy?: RetryPolicy
    signal?: AbortSignal
    onRetry?: (attempt: number, delayMs: number, err: unknown) => void
  }
): Promise<T>
```

- `isTransientError` matches AbortError → false, and: ETIMEDOUT / ECONNRESET / ECONNREFUSED / ETLSCONNECT, HTTP 429/500/502/503/504, and message patterns `/rate.?limit/i`, `/overloaded/i`, `/temporarily unavailable/i`. Everything else is permanent.
- `nextDelayMs(prev) = min(cap, random_uniform(base, prev * 3))`. First attempt's "prev" is base.

Wired into `execution-engine.ts`:

- `runDelegatedTask` wraps `runEmployeeLoop` in `withRetry`. Each retry increments `task.retryCount`. `task.maxRetries` (existing column) caps attempts; default 1 (so up to 2 total tries) stays.
- On retry, emit a `tool_card`-style event or `conversation_error` event? For visibility we add a small SSE: `delegation_retry` (`{conversationId, taskId, attempt, delayMs}`) — renders as a subtle toast or inline note in the chat. Keeps the user from thinking the agent is just slow.
- `signal` from PM coordinator passes through; aborts short-circuit retries.

### 4. Toast errors

`useConversationStream` already exposes `error: string | null`. Add an optional callback so the consumer (GroupChat) can fire a sileo toast on each new error, AND keep the inline display. Two birds, one event.

The Container (`philharmonic.tsx`) is already mounted under `<AppToaster />` so `sileo.error(...)` calls land in the right place — we just need to call them at the right moment.

For `delegation_retry` events: silent — already captured in conversation_event log + plan card. No toast.

## File touchpoints

| File                                                       | Change                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/main/lib/philharmonic-notifications.ts` _(new)_       | `notifyIfBackground()`                                                 |
| `src/main/lib/ai/philharmonic/retry.ts` _(new)_            | `withRetry()`, `isTransientError()`, jitter                            |
| `src/main/lib/ai/philharmonic/retry.test.ts` _(new)_       | Backoff bounds, transient classifier, abort short-circuit              |
| `src/main/lib/ai/philharmonic/execution-engine.ts`         | Wrap runEmployeeLoop in retry; emit retry SSE; bump task.retryCount    |
| `src/main/lib/ai/philharmonic/pm-coordinator.ts`           | Fire notification on plan completion and PM error                      |
| `src/main/lib/db/philharmonic-queries.ts`                  | `incrementTaskRetryCount(taskId)` helper                               |
| `src/shared/types/philharmonic.ts`                         | Add `delegation_retry` SSE variant                                     |
| `src/renderer/hooks/use-conversation-stream.ts`            | Handle `delegation_retry`; expose `onError` callback                   |
| `src/renderer/components/philharmonic/chat/group-chat.tsx` | Fire sileo toast on new error                                          |
| `src/main/index.ts` (or window setup)                      | Expose a way to query `mainWindow.isFocused()` to notifications module |

## Tests

- `retry.test.ts`:
  - `isTransientError` true/false matrix
  - `nextDelayMs` lies within `[base, cap]` and respects the `min(cap, prev*3)` ceiling
  - `withRetry` retries on transient errors up to `maxAttempts`, throws on permanent
  - `withRetry` short-circuits on AbortSignal
- Existing PM coordinator test stays green (the new code paths sit behind transient-only branches).

## Rollout

All four pieces land in one commit since they're tightly coupled. Migration: none.
