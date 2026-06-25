# Philharmonic P0-3 — Lossless Context Management (scoped)

**Date:** 2026-06-05
**Status:** Approved, executing
**Scope:** Stop the PM from blowing through its context window on long Groups. Ships a Philharmonic-private LCM that summarizes the older messages of a conversation into a rolling system message, while keeping a configurable fresh tail of raw messages.

## Goal

Today `pm-coordinator.ts` reads every conversation_message row and turns each into an LLM message via `buildHistory()`. A Group that runs for 30 turns can already overflow a 128k window; busy ones with image attachments hit it sooner. After P0-3, history is replaced with a `PhilharmonicLcm.assembleContext()` result that consists of (optional summary system message) + recent N raw messages, kept under a configurable token budget.

## Decisions

- **Philharmonic-private tables.** `philharmonic_session_summary` lives next to Chat's LCM tables but never mixes — same physical data isolation principle as the rest of P0. Chat's existing `lcm_*` tables are untouched.
- **Scoped-down LCM, not Chat's DAG.** Chat's LCM tracks multi-level condensed summaries with parent edges. The Philharmonic v1 uses a **single rolling summary** per conversation: a paragraph that covers everything older than the fresh tail. When the conversation grows, we re-summarize, replacing the previous summary. This is enough for v1 (a Group rarely needs to surgically address "summary #14"), and trades nuance for substantially less code and zero new failure modes. Future P1 can promote to multi-level if Groups grow much longer.
- **Reuse `setting.memoryLayer.*` keys.** `lcmEnabled`, `contextWindowPercent`, `freshTailSize` already exist in the settings schema and are exposed in the Memory settings UI. We just consume them here too.
- **Skip compaction when disabled.** If `lcmEnabled` is false (user opt-out), `assembleContext` falls back to the same logic `buildHistory` had — every persisted message converted in order. We don't surprise users who've turned LCM off.
- **Fire-and-forget compaction.** Like Chat, the PM coordinator awaits `assembleContext()` to build its prompt but does not await `trackAndCompact()` afterwards. Summaries land for the next turn.

## Out of scope

- Multi-level DAG summaries (Chat-style).
- Per-employee LCM (employees still get the raw delegation instructions; their loops are short enough not to need compaction in v1).
- Summary editability from the UI.
- A status bus / progress indicator in the renderer. Chat has `lcm-status-bus`; for Philharmonic v1 we log to the existing `philharmonic` log surface only.

## Data model

One new table:

```ts
export const philharmonicSessionSummary = pgTable(
  'philharmonic_session_summary',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    conversationId: uuid('conversationId')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    // Rolling paragraph covering everything older than `coversThroughMessageId`.
    content: text('content').notNull(),
    // The last message ID included in this summary. The PM context builder
    // uses this to know which messages to leave as raw fresh-tail.
    coversThroughMessageId: uuid('coversThroughMessageId')
      .notNull()
      .references(() => conversationMessage.id, { onDelete: 'set null' }),
    tokenCount: integer('tokenCount').notNull(),
    // Number of source messages folded into this summary. Useful for the
    // markdown plan mirror / future analytics.
    messageCount: integer('messageCount').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull()
  },
  (t) => [index('ph_session_summary_conv_idx').on(t.conversationId)]
)
```

One row per conversation. `coversThroughMessageId` records the boundary; older summaries are overwritten (no history).

`ON DELETE CASCADE` on conversation → row goes away with the Group. `ON DELETE SET NULL` on the boundary message handles the edge case where someone deletes a single message row (rare).

## Public API

```ts
// src/main/lib/ai/philharmonic/lcm/index.ts
export class PhilharmonicLcm {
  constructor(
    conversationId: string,
    model: Model,
    apiKey: string,
    options: {
      freshTailSize?: number
      contextWindowPercent?: number
      contextWindow?: number
      enabled?: boolean
    }
  )

  /** Build the LLM history. When disabled, behaves like the existing buildHistory. */
  async assembleContext(excludeMessageId?: string): Promise<Message[]>

  /** After a turn completes, recompute the rolling summary if context exceeds threshold. Safe to fire-and-forget. */
  async trackAndCompact(): Promise<void>
}
```

## Algorithm

`assembleContext(excludeMessageId)`:

1. Load all messages for the conversation, sorted by createdAt asc. Skip `excludeMessageId`.
2. Load the current summary row (if any).
3. If no summary OR LCM disabled: return all messages converted to LLM Messages. Done.
4. If summary exists:
   - Find the index of `coversThroughMessageId` in the message list. Everything at and before that boundary is "absorbed"; everything after is the raw tail.
   - Construct LLM messages from: `[summary_as_user_message] + raw_tail`.
   - Note: the summary is emitted as a `user` role message with XML markers similar to Chat (`<lcm:summary>…</lcm:summary>`) so providers don't get confused. This mirrors how Chat injects summaries today.

`trackAndCompact()`:

1. Load all messages.
2. Compute total token cost of "uncovered" messages (those not in the current summary's coverage), plus the current summary cost (if any).
3. If total ≤ threshold: nothing to do.
4. Otherwise:
   - Identify the **compaction range**: messages from start up to `total - freshTail`.
   - Build a single summarization prompt over those messages (text-only — image content compresses too poorly to send back to the summarizer).
   - Call the LLM. The output replaces the previous summary row.
   - `coversThroughMessageId` becomes the last message in the compaction range; `messageCount` is set to the size; `tokenCount` to the estimated cost of the new summary content.

Compaction is serialized per-conversation via a static `Map<conversationId, Promise<void>>` queue — same pattern as Chat's `LcmManager.compactionQueues`. Two concurrent PM turns will not race on the same summary.

## Settings

- `memoryLayer.lcmEnabled` (bool, default true)
- `memoryLayer.contextWindowPercent` (50-95, default 75)
- `memoryLayer.freshTailSize` (8-64, default 16)

These are pulled from `getSettings()` inside `runPmCoordinator` and forwarded into the `PhilharmonicLcm` constructor.

## File touchpoints

| File                                                                       | Change                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/main/lib/db/schema.ts`                                                | Add `philharmonicSessionSummary`                                                                    |
| `resources/drizzle/000X_*.sql`                                             | Generated migration                                                                                 |
| `src/main/lib/ai/philharmonic/lcm/queries.ts` _(new)_                      | get/upsert summary row                                                                              |
| `src/main/lib/ai/philharmonic/lcm/summarize.ts` _(new)_                    | LLM summarization prompt + invocation                                                               |
| `src/main/lib/ai/philharmonic/lcm/token-counter.ts` _(new — tiny wrapper)_ | reuse Chat's existing token-counter (re-export)                                                     |
| `src/main/lib/ai/philharmonic/lcm/index.ts` _(new)_                        | `PhilharmonicLcm` class                                                                             |
| `src/main/lib/ai/philharmonic/lcm/index.test.ts` _(new)_                   | algorithm tests with mocked LLM                                                                     |
| `src/main/lib/ai/philharmonic/pm-coordinator.ts`                           | Replace `buildHistory()` call with `lcm.assembleContext()`; call `lcm.trackAndCompact()` after turn |

`buildHistory` stays around as the disabled-path implementation, called internally by `PhilharmonicLcm.assembleContext` when LCM is off.

## Tests

- summary boundary math: with N=20 messages, freshTail=5, threshold reached → compaction range = first 15
- Disabled mode bypass: `assembleContext` returns all messages without consulting the summary table
- No-op when under threshold: trackAndCompact doesn't write
- LLM error path: trackAndCompact swallows + logs but doesn't poison assembleContext on next turn (no partial row)

## Rollout

Single commit. One migration. No behavior change for Chat.
