# LCM Compaction Visibility — Design

**Date**: 2026-05-20
**Status**: Draft (pending implementation)
**Scope**: Surface the existing LCM (Lossless Context Management) post-turn compaction process in the chat UI so users understand why a turn boundary feels slow.

## Background

The codebase already runs hierarchical context compaction via `LcmManager.compactAfterTurn()` (see `src/main/lib/ai/context-management/`). It fires post-turn, in the background, behind a per-chat promise queue, and replaces ranges of messages in `lcm_context_items` with summary references. Original `message` rows are never deleted. The mechanism is currently invisible to the user — they only feel the latency.

The goal of this feature is **purely additive visibility**. No change to compaction semantics, threshold, hierarchy, or storage.

## Non-Goals

- Pre-turn blocking compaction (LCM already does what's needed post-turn).
- Persisting a "compaction summary" message in the chat history.
- Exposing the DAG / summary contents to the user.
- Showing progress in the sidebar chat list.
- Changing the LCM trigger threshold, fresh tail size, or compaction algorithm.

## User-Facing Behavior

When a user is viewing an active chat and `compactAfterTurn` begins real work for that chat, an inline status card appears between the message list and the composer:

- **Running** — `◌  Compacting conversation history…` (subtle spinner, low-contrast pill).
- **Just completed** — `✓  Compacted N messages · saved ~Xk tokens` (auto-dismisses after ~6s).
- **Error** — `!  Compaction failed (will retry next turn)` (red thin border, auto-dismisses after 6s).
- **Idle** — not rendered.

The card is **ephemeral** — purely in-memory render state. Page refresh, switching chats, or closing the app loses the card. It is never inserted into the `message` table and never appears in `getMessagesByChatId` responses.

If LCM is disabled in settings (`memoryLayer.lcmEnabled === false`), the card never appears.

## Architecture

### Component diagram

```
┌──────────────────────┐        emit         ┌────────────────────┐
│  LcmManager          │ ──────────────────▶ │  LcmStatusBus      │
│  .compactAfterTurn() │                     │  (singleton bus)   │
└──────────────────────┘                     └─────────┬──────────┘
                                                       │  subscribe(chatId)
                                                       ▼
                                          ┌────────────────────────┐
                                          │  GET /api/chat/:id/    │
                                          │  lcm-status (Hono SSE) │
                                          └────────┬───────────────┘
                                                   │  EventSource
                                                   ▼
                                          ┌────────────────────────┐
                                          │  useLcmStatus(chatId)  │
                                          │       ▼                │
                                          │  <LcmStatusCard />     │
                                          └────────────────────────┘
```

### Backend: status bus

New module `src/main/lib/ai/context-management/lcm-status-bus.ts`:

```ts
export type LcmStatusEvent =
  | { type: 'start'; chatId: string; startedAt: number }
  | {
      type: 'complete'
      chatId: string
      durationMs: number
      messagesBefore: number
      messagesAfter: number
      tokensSaved: number
    }
  | { type: 'error'; chatId: string; error: string }

class LcmStatusBus {
  emit(event: LcmStatusEvent): void
  subscribe(chatId: string, listener: (e: LcmStatusEvent) => void): () => void
  getCurrentState(chatId: string): 'idle' | 'running'
}

export const lcmStatusBus = new LcmStatusBus()
```

Implementation details:

- Backed by a `Map<chatId, Set<listener>>` plus a `Set<chatId>` of currently-running chats.
- `emit({ type: 'start' })` adds to running set; `complete` / `error` removes it.
- `getCurrentState` returns `'running'` iff the chatId is in the running set — used by late SSE subscribers to sync.
- No persistence, no buffering of past events. If a subscriber connects after `complete` fires, they see `idle`.

### LcmManager integration

Modify `src/main/lib/ai/context-management/index.ts`:

In `runCompactionIfNeeded`:

1. Compute `messagesBefore` and `tokensBefore` from the current `lcm_context_items` snapshot.
2. If `currentTokens <= threshold` → return immediately (no events emitted; nothing to show).
3. Otherwise `lcmStatusBus.emit({ type: 'start', chatId, startedAt: now })`.
4. Run the existing compaction loop in a `try`. On success, compute `messagesAfter` and `tokensAfter` from the post-compaction snapshot, then `emit({ type: 'complete', ..., tokensSaved: tokensBefore - tokensAfter })`.
5. On caught error: `emit({ type: 'error', chatId, error: String(err) })` and rethrow so the existing `.catch(logger.error)` outer handler still logs.

Per the brief, no event emission means no UI flash — the card is only shown when compaction does real work.

### SSE route

New route file `src/main/lib/server/routes/lcm-status.ts`, registered alongside the other route modules:

```
GET /api/chat/:id/lcm-status   → text/event-stream
```

Handler:

1. Read `:id`, set SSE headers.
2. Send `init` event with `{ state: lcmStatusBus.getCurrentState(id) }`.
3. Subscribe to bus filtered by `id`; forward every event as a `data:` SSE frame.
4. Listen on `c.req.raw.signal` for `abort` → unsubscribe and close.

Note: if `memoryLayer.lcmEnabled === false`, the route still returns an SSE stream that emits only `init: { state: 'idle' }` and stays open. No special-casing needed since compaction never emits in that case.

### Frontend

**Hook** `src/renderer/hooks/use-lcm-status.ts`:

```ts
type LcmStatusState =
  | { kind: 'idle' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'just_completed'; payload: CompleteEvent }
  | { kind: 'error'; message: string }

function useLcmStatus(chatId: string): LcmStatusState
```

Behavior:

- Opens an `EventSource('/api/chat/' + chatId + '/lcm-status')` on mount / when `chatId` changes.
- Maps incoming events: `init` → either `idle` or `running` (with synthetic `startedAt`); `start` → `running`; `complete` → `just_completed`, then schedule a 6s timeout to flip back to `idle`; `error` → `error`, also 6s timeout back to `idle`.
- Closes the `EventSource` on unmount / `chatId` change. Clears any pending timeouts.
- No retry logic of our own — `EventSource` auto-reconnects; the new connection re-syncs via `init`.

**Component** `src/renderer/components/chat/lcm-status-card.tsx`:

- Props: `{ chatId: string }`.
- Internally calls `useLcmStatus(chatId)`.
- Returns `null` when state is `idle`.
- Otherwise renders a subtle pill (Tailwind `bg-muted/60`, `text-muted-foreground`, small font, rounded), using the project's existing spinner for `running` and a checkmark icon for `just_completed`.
- Not clickable; no expanded detail in MVP.

**Integration**: Add `<LcmStatusCard chatId={chatId} />` to the chat layout between the messages list and the composer (likely in `src/renderer/layouts/chat-layout/` or wherever the message stream + composer are composed).

## Data Flow Walkthrough

1. User completes turn N. Chat route's POST `/api/chat` SSE finishes streaming the assistant message and closes.
2. The same handler kicks off `lcm.compactAfterTurn()` (fire-and-forget, existing behavior).
3. `runCompactionIfNeeded` evaluates the threshold. If under, returns silently — UI stays idle.
4. If over, emits `start`. The user's open `/api/chat/:id/lcm-status` SSE forwards it. `<LcmStatusCard>` flips to `running`.
5. LCM runs leaf pass(es) and condensed pass(es) per existing code. Original `message` rows untouched.
6. On success: emits `complete` with stats. UI shows confirmation pill for 6s, then idle.
7. User can now type the next message. By the time they do, compaction has typically finished (or close to it). The next turn's `assembleContext()` reads the freshly-compacted `lcm_context_items` as usual.

## Error Handling

| Failure                                       | Effect                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM call inside compaction throws             | Existing `summarizeWithFallback` already has 3 attempts incl. deterministic fallback; compaction usually still succeeds. If it does throw, bus emits `error`, UI shows red pill 6s, log line written. Next turn's compaction will retry from current state. |
| SSE connection drops                          | `EventSource` auto-reconnects. Server's new connection sends fresh `init` reflecting current bus state, so reconnects don't lose visibility into a still-running compaction.                                                                                |
| User switches chats during running compaction | Old SSE closes. The compaction keeps running in the background (it never depended on the SSE). If the user returns later before `complete` fires, the new SSE's `init` will report `running`.                                                               |
| LCM disabled                                  | No events ever emitted. SSE stays open, card stays hidden.                                                                                                                                                                                                  |
| Process restart mid-compaction                | Bus state is in-memory and lost; running set is cleared. Card won't reappear on restart, which matches "ephemeral" semantics. The half-done compaction's effects in `lcm_context_items` are still persisted as far as it got.                               |

## Testing

**Unit tests**:

- `lcm-status-bus.test.ts`
  - `emit('start')` → `getCurrentState` returns `'running'`.
  - `emit('complete')` → `getCurrentState` returns `'idle'`.
  - Multiple subscribers for the same chatId all receive events.
  - Subscriber for chatId A does not receive chatId B's events.
  - `unsubscribe()` removes the listener — subsequent emits don't call it.

- `LcmManager.compactAfterTurn` event emission
  - Mock `runCompactionIfNeeded` to short-circuit before threshold → no events emitted.
  - Mock to exceed threshold and resolve → `start` then `complete` emitted in order, with `tokensSaved > 0` shape.
  - Mock to throw → `start` then `error` emitted.

**Manual verification**:

1. Start `pnpm dev`. Open or create a long chat with at least one fresh provider key.
2. Drive the chat over the LCM threshold (lower `contextWindowPercent` in settings temporarily to make this fast, or paste a large prompt).
3. After the assistant's last reply finishes streaming, observe the `Compacting…` card appears above the composer.
4. Wait for it to flip to `Compacted N messages…` and auto-dismiss after ~6s.
5. Refresh the page — card stays gone.
6. Disable LCM in settings. Drive over threshold again. Verify card never appears.

## File Manifest

New files:

- `src/main/lib/ai/context-management/lcm-status-bus.ts`
- `src/main/lib/ai/context-management/lcm-status-bus.test.ts`
- `src/main/lib/server/routes/lcm-status.ts`
- `src/renderer/hooks/use-lcm-status.ts`
- `src/renderer/components/chat/lcm-status-card.tsx`

Modified files:

- `src/main/lib/ai/context-management/index.ts` — emit start/complete/error inside `runCompactionIfNeeded`, capture before/after stats.
- Main server setup (wherever the existing route modules are mounted) — register the new SSE route.
- Chat layout file in `src/renderer/layouts/chat-layout/` (or message stream container) — mount `<LcmStatusCard chatId={...} />`.

No DB schema changes. No migration.

## Open Questions

None blocking. The design choices for spinner styling and exact pill copy can be settled during implementation by reusing existing component conventions.
