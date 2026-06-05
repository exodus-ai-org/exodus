# Philharmonic P1-6 — Interrupt a running Group

**Date:** 2026-06-05
**Status:** Approved, executing
**Scope:** The user can stop a PM run mid-flight. The composer surfaces a Stop button while the PM is active; clicking it aborts the agent loop, marks any in-flight plan steps as failed with an "Interrupted by user" note, and persists a system message so the conversation reads honestly.

## Goal

Today `runPmCoordinator` accepts an `AbortSignal` that is already plumbed all the way down through `agentLoop`, `runDelegatedTask`, and `runEmployeeLoop`. Nothing creates or stores a controller, so no caller can actually pull the cord. P1-6 adds the missing infrastructure: a per-conversation registry of controllers, an HTTP route to call `.abort()`, SSE events to tell the renderer the PM is busy/done, and a Stop affordance in the Composer.

## Decisions

- **One controller per conversation, freshest wins.** If a user sends two messages quickly (race we don't expect but should handle), the second turn replaces the first's controller. Aborting only affects whatever is currently registered. We do not try to cancel a stale PM run via a stale controller because that PM is already done by definition.
- **Abort is graceful, not destructive.** When the PM run is aborted, we:
  - mark any `running` plan steps as `failed` with note "Interrupted by user"
  - persist a system message in the conversation
  - emit `pm_ended` with `reason: "aborted"` and a `conversation_error` for the toast
  - leave the plan itself in `active` (the user can send another message to continue or abandon)
- **pm_started / pm_ended drive the busy state.** Renderer tracks `pmRunning` from these two events. We don't try to derive it from `message_start/end` (which can mean PM OR employee).
- **Stop button replaces Send while busy.** Mirrors Chat's existing pattern. Clicking Stop POSTs `/conversations/:id/interrupt`; the SSE pm_ended will arrive shortly after.

## Out of scope

- Pause / resume (we only support abort).
- Editing a step's instructions mid-flight.
- Per-step interrupt (you abort the whole turn).

## Pieces

### `pm-run-registry.ts` (new)

```ts
export const pmRunRegistry = {
  set(conversationId: string, controller: AbortController): void
  abort(conversationId: string): boolean   // true if there was one to abort
  has(conversationId: string): boolean
}
```

A module-level `Map<string, AbortController>`. Entries cleared in the route's `finally`.

### POST /api/philharmonic/conversations/:id/interrupt

- Looks up the controller for `:id`
- Calls `.abort()` if found
- Returns `{ success: true, wasRunning: boolean }`
- Never errors — idempotent

### PM coordinator changes

- Wrap the existing `try { … } catch (err) { … }` so AbortError gets its own branch:
  - mark any running plan steps as failed
  - persist a system message: `⚠️ PM run was interrupted by the user.`
  - emit `conversation_error` ("PM run was interrupted") so the existing sileo toast fires
  - emit `pm_ended` with `reason: "aborted"`
  - do NOT call `notifyIfBackground` (interrupt was user-initiated; they know)
- At the top of the run: emit `pm_started`. At the end (success, error, or abort): emit `pm_ended` with the right reason. The route's `finally` removes the registry entry.

### SSE additions

```ts
type PhilharmonicSseEvent =
  | // … existing
  | { type: 'pm_started'; conversationId: string }
  | { type: 'pm_ended'; conversationId: string; reason: 'done' | 'error' | 'aborted' }
```

### Renderer

- `useConversationStream` gains `pmRunning: boolean`. Set true on `pm_started`, false on `pm_ended`, and reset to false on conversation switch.
- New service `interruptConversation(id)`.
- `Composer` accepts an optional `busy: boolean` prop and `onStop?: () => void`. When `busy`, the Send button becomes a Stop button (Square icon, red-tinted) that calls `onStop`. Text input stays enabled so the user can start drafting the next message.
- `GroupChat` reads `pmRunning` from the stream and passes it down with an `onStop` that calls `interruptConversation`.

## File touchpoints

| File                                                       | Change                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/main/lib/ai/philharmonic/pm-run-registry.ts` _(new)_  | controller map                                                      |
| `src/main/lib/ai/philharmonic/pm-coordinator.ts`           | emit pm_started/ended; AbortError branch; mark running steps failed |
| `src/main/lib/server/routes/philharmonic-conversations.ts` | wire controller into runPmCoordinator; POST /interrupt              |
| `src/shared/types/philharmonic.ts`                         | two new SSE variants                                                |
| `src/renderer/services/philharmonic-chat.ts`               | `interruptConversation(id)`                                         |
| `src/renderer/hooks/use-conversation-stream.ts`            | `pmRunning` state                                                   |
| `src/renderer/components/philharmonic/chat/composer.tsx`   | Stop button when busy                                               |
| `src/renderer/components/philharmonic/chat/group-chat.tsx` | pass `busy`/`onStop`                                                |

## Tests

- pm-run-registry: set/has/abort behavior + abort returns false when nothing set
- pm coordinator: AbortError path marks running steps failed, emits aborted reason

## Rollout

Single commit. No migration.
