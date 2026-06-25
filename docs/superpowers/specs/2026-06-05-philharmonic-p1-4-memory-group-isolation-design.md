# Philharmonic P1-4 — Agent memory isolated per Group

**Date:** 2026-06-05
**Status:** Approved, executing
**Scope:** `agent_memory` rows become per-(agent, conversation) instead of per-agent. The runtime view (what the employee LLM sees) is scoped to the current Group. The Workforce → Employee inspection view continues to show every memory across every Group it was earned in (admin transparency).

## Goal

Today an employee that worked on a finance task in Group A carries that memory into Group B's marketing task. Per the user's "class vs instance" framing, the agent is a class and each Group's use of it is an instance — instance state (accumulated task experience) must not bleed between instances.

After P1-4 the employee loop only sees memories tied to the current `conversationId`. No cross-Group contamination.

## Decisions

- **Hard isolation, not two-layer.** `conversationId` is **NOT NULL** on every memory row. We do not model a "global memory" tier in v1 — those facts can live in the agent's `systemPrompt`. A future P2 can introduce a `scope` column if a real need shows up.
- **Fresh project, no legacy data.** User confirmed: dump existing rows in the migration before adding the NOT NULL column. No backfill, no fallback path.
- **Inspection view shows everything.** The Employee editor's "Memory (read-only)" panel still calls `getAgentMemories(agentId)` without a conversation filter — it's the admin's window into what the agent has ever learned. We'll group results by conversation in a future polish (out of scope here).
- **Cascade on conversation delete.** When a Group is deleted, its agent_memory rows go with it (`ON DELETE CASCADE`). No orphaned rows.

## Schema

```ts
export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id, { onDelete: 'cascade' }),
  // NEW: every memory row is scoped to the Group it was learned in.
  conversationId: uuid('conversationId')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  source: agentMemorySourceEnum('source').notNull().default('task'),
  confidence: real('confidence').default(0.8),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})
```

### Migration

Drizzle will emit `ALTER TABLE ... ADD COLUMN conversationId uuid NOT NULL REFERENCES ...`. That fails on existing rows. We edit the generated SQL to TRUNCATE first:

```sql
TRUNCATE TABLE "agent_memory";
ALTER TABLE "agent_memory" ADD COLUMN "conversationId" uuid NOT NULL;
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;
```

Acceptable because the user confirmed the project has no production data worth keeping.

## Query API

```ts
// db/philharmonic-queries.ts
export async function getAgentMemories(
  agentId: string,
  conversationId?: string // when provided, filter to this Group
)
export async function createAgentMemory(
  data: typeof agentMemory.$inferInsert // conversationId now required by the inferred insert type
)
```

`getAgentMemories(agentId)` — admin/inspection (returns all)
`getAgentMemories(agentId, conversationId)` — runtime (returns only this Group's)

## Runtime wiring

- `rememberTaskOutcome(agentId, conversationId, instructions, output)` — explicit conversationId argument; passed straight to `createAgentMemory`.
- `runDelegatedTask` already has `conversationId` in scope; threads it into `rememberTaskOutcome`.
- `runEmployeeLoop` calls `getAgentMemories(agent.id, conversationId)` so the system prompt only mentions this Group's prior task outcomes.

## Out of scope

- Memory write-judge (Chat-side LCM has structured types + judge; we keep the current naive `rememberTaskOutcome` for v1).
- Cross-Group "global" memory tier.
- UI grouping of inspection-view memories by Group.

## File touchpoints

| File                                               | Change                                         |
| -------------------------------------------------- | ---------------------------------------------- |
| `src/main/lib/db/schema.ts`                        | Add `conversationId` NOT NULL FK               |
| `resources/drizzle/000X_*.sql`                     | Generated, edited to TRUNCATE first            |
| `src/main/lib/db/philharmonic-queries.ts`          | `getAgentMemories(agentId, conversationId?)`   |
| `src/main/lib/ai/philharmonic/agent-memory.ts`     | Add `conversationId` to `rememberTaskOutcome`  |
| `src/main/lib/ai/philharmonic/execution-engine.ts` | Pass `conversationId` to `rememberTaskOutcome` |
| `src/main/lib/ai/philharmonic/employee-loop.ts`    | Pass `conversationId` to `getAgentMemories`    |
| Tests                                              | Update agent-memory.test, employee-loop.test   |
