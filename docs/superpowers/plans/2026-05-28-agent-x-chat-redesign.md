# Agent X Chat-Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Agent X from an org-chart/task-dispatch tool into a Feishu/DingTalk-style group-chat collaboration tool where a built-in PM coordinator analyzes a user's request, recruits/delegates to virtual employees, supervises and corrects their work, and reports back — all rendered live as a group chat.

**Architecture:** Reuse the existing `pi-agent-core` `agentLoop` engine and `SseManager`. Add a **PM coordinator** layer (a top-level agent whose tools are `delegateTask` / `recruitEmployee` / `searchKnowledgeBase` / `askUser`). Employees run their own `agentLoop` sourcing skills/MCP/tools from themselves (not a department). State lives in three new tables (`conversation`, `conversationMessage`, `knowledgeDoc`); `department` is dropped and the agent's identity gains `team`/`avatarSeed`/`avatarStyle`. The frontend becomes a three-column group chat plus Employees and Knowledge Base pages.

**Tech Stack:** Electron + React 19 + Hono + Drizzle/PGlite + `@mariozechner/pi-agent-core` / `pi-ai` + node-cron + DiceBear (avatars) + Jotai + SWR.

**Source spec:** `docs/superpowers/specs/2026-05-27-agent-x-chat-redesign-design.md`

---

## Conventions used throughout this plan

- **Naming (locked — keep consistent across tasks):**
  - New chat table is `conversationMessage` (SQL `conversation_message`), type `ConversationMessage`. It does **not** reuse the existing chat `message` table.
  - Role enum `conversationMessageRoleEnum` = `['user','pm','employee','system']`.
  - Tables: `conversation` → `Conversation`; `knowledgeDoc` (`knowledge_doc`) → `KnowledgeDoc`.
  - PM coordinator module: `pm-coordinator.ts`; PM tools: `pm-tools.ts`; recruit helper: `recruit.ts`; KB tool: `kb-tools.ts`.
- **Tests:** Vitest only runs over `src/main/lib/**` and `src/shared/**` (see `vitest.config.ts`). There is **no renderer test harness**, so:
  - Backend / shared / DB-logic tasks use full TDD (write failing test → implement → pass).
  - Frontend tasks verify with `pnpm typecheck:web` and a manual `pnpm dev` check (described per task). Do not invent renderer unit tests.
- **DB-touching tests** must mock Electron/PGlite at the top of the file and dynamic-import the module under test:
  ```typescript
  vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
  vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
  vi.mock('../../db/db', () => ({ db: {}, pglite: {} }))
  const { thing } = await import('./module')
  ```
  When a test needs to assert on query behavior, mock the specific query functions instead of the real `db`.
- **Commit after every task** with the message shown in that task's final step.
- Run the test for a single file with: `pnpm test <path>` (Vitest picks it up; or `pnpm test:watch`).

---

## File Structure (what gets created / modified / retired)

**Created — backend**

- `src/main/lib/db/conversation-queries.ts` — conversation + conversationMessage CRUD/queries
- `src/main/lib/db/knowledge-queries.ts` — knowledgeDoc CRUD + substring search
- `src/main/lib/ai/agent-x/recruit.ts` — `autoCreateEmployee()` (name pool + avatar seed), shared
- `src/main/lib/ai/agent-x/kb-tools.ts` — `createSearchKnowledgeBaseTool()`
- `src/main/lib/ai/agent-x/pm-tools.ts` — `createDelegateTaskTool` (employee roster), `createRecruitEmployeeTool`, re-uses `createEscalateToUserTool` as `askUser`
- `src/main/lib/ai/agent-x/pm-coordinator.ts` — the PM `agentLoop`, ask-user pending registry
- `src/main/lib/ai/agent-x/employee-loop.ts` — extracted/rewritten employee `agentLoop` (skills/MCP from agent; usage capture; conversation bubbles)
- `src/main/lib/ai/agent-x/names.ts` — neutral name pool + `pickName()`
- `src/main/lib/server/routes/agent-x-conversations.ts` — conversation/message/send/respond routes + conversation SSE + costs endpoint
- `src/shared/constants/avatar.ts` — avatar style constant + helpers

**Created — frontend**

- `src/renderer/services/agent-x-chat.ts` — conversation/message/KB/costs API wrappers
- `src/renderer/stores/agent-x-chat.ts` — Jotai atoms for chat UI
- `src/renderer/hooks/use-conversation-stream.ts` — SSE subscription (modeled on `use-lcm-status.ts`)
- `src/renderer/components/agent-x/chat/conversation-list.tsx`
- `src/renderer/components/agent-x/chat/group-chat.tsx`
- `src/renderer/components/agent-x/chat/group-message-bubble.tsx`
- `src/renderer/components/agent-x/chat/group-members-panel.tsx`
- `src/renderer/components/agent-x/chat/composer.tsx`
- `src/renderer/components/agent-x/employees/employees-page.tsx`
- `src/renderer/components/agent-x/employees/employee-editor.tsx`
- `src/renderer/components/agent-x/employees/avatar-picker.tsx`
- `src/renderer/components/agent-x/employees/employee-avatar.tsx`
- `src/renderer/components/agent-x/knowledge/knowledge-base-page.tsx`

**Modified**

- `src/main/lib/db/schema.ts` — drop `department`; alter `agent` + `task`; add `conversation`, `conversationMessage`, `knowledgeDoc` + enum
- `src/main/lib/db/agent-x-queries.ts` — drop department CRUD, drop `isShadow`/`collaborator` assumptions, re-export new query modules, agent-memory writer
- `src/main/lib/ai/agent-x/scheduler.ts` — fire into conversation + PM loop (not `smartDispatch`)
- `src/main/lib/ai/agent-x/execution-engine.ts` — becomes thin re-export/shim over `employee-loop.ts` (or deleted; see Task)
- `src/main/lib/server/routes/agent-x-crud.ts` — drop department routes + auto-route/auto-fill; keep agent + task CRUD (agent-self fields)
- `src/main/lib/server/routes/agent-x.ts` — mount conversations router
- `src/main/lib/server/routes/agent-x-sse.ts` — add conversation topic helpers
- `src/shared/types/agent-x.ts` — extend `AgentXSseEvent`; add `ConversationMessageRole`
- `src/renderer/layouts/agent-x-layout/index.tsx` — new pages (Chat default, Employees, Knowledge Base, Dashboard/Costs secondary)
- `src/renderer/containers/agent-x.tsx` — render new pages
- `src/renderer/components/agent-x/dashboard/app-sidebar.tsx` + `nav-main.tsx` — new nav items
- `src/renderer/components/agent-x/cost-analysis.tsx` — read agent-x costs endpoint
- `src/renderer/services/agent-x.ts` — drop department + auto-route/fill wrappers
- `src/renderer/stores/agent-x.ts` — drop department-graph atoms; update `AgentData`/`TaskData` types
- `package.json` — add `@dicebear/core`, `@dicebear/collection`

**Retired (delete or archive)**

- Backend: `auto-router.ts`, `auto-fill.ts`, `smart-dispatch.ts`
- Frontend: `org-editor-graph.tsx`, `org-graph.tsx`, `department-config-panel.tsx`, `task-dispatch-dialog.tsx`, `task-kanban.tsx`, `task-list.tsx`, `execution-timeline.tsx`, `agent-config-panel.tsx` (replaced by `employee-editor.tsx`), `ui/` graph helpers (`base-node.tsx`, `node.tsx`, `node-tooltip.tsx`, `zoom-slider.tsx`)

---

# Phase 0 — Dependencies & avatar constants

### Task 0.1: Add DiceBear dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install the avatar libraries**

Run:

```bash
pnpm add @dicebear/core @dicebear/collection
```

Expected: `package.json` gains both under `dependencies`; lockfile updates.

- [ ] **Step 2: Verify they import in a browser/Vite context**

Run: `pnpm typecheck:web`
Expected: PASS (no missing-module errors). DiceBear v9 is ESM and renderer-safe.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(agent-x): add dicebear for deterministic employee avatars"
```

### Task 0.2: Avatar style constant + seed helper (shared)

**Files:**

- Create: `src/shared/constants/avatar.ts`
- Test: `src/shared/constants/avatar.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/shared/constants/avatar.test.ts
import { describe, expect, it } from 'vitest'
import { AVATAR_STYLES, DEFAULT_AVATAR_STYLE, randomAvatarSeed } from './avatar'

describe('avatar constants', () => {
  it('exposes the candidate styles and a default within them', () => {
    expect(AVATAR_STYLES).toContain(DEFAULT_AVATAR_STYLE)
    expect(AVATAR_STYLES.length).toBeGreaterThanOrEqual(3)
  })

  it('generates non-empty unique-ish seeds', () => {
    const a = randomAvatarSeed()
    const b = randomAvatarSeed()
    expect(a).toMatch(/^[a-z0-9]+$/i)
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/constants/avatar.test.ts`
Expected: FAIL — cannot find module `./avatar`.

- [ ] **Step 3: Implement**

```typescript
// src/shared/constants/avatar.ts
// DiceBear style ids we ship. Final default is confirmed visually in Phase 6.
export const AVATAR_STYLES = ['notionists', 'thumbs', 'adventurer'] as const
export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'notionists'

/** Deterministic-render seed; only the seed is stored, never the image. */
export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 12)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/shared/constants/avatar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants/avatar.ts src/shared/constants/avatar.test.ts
git commit -m "feat(agent-x): add avatar style constants and seed helper"
```

---

# Phase 1 — Data model + migration

### Task 1.1: Schema — drop department, alter agent & task, add new tables

**Files:**

- Modify: `src/main/lib/db/schema.ts:214-322` (the `// ─── Agent X ───` block)

- [ ] **Step 1: Replace the Agent X schema block**

Replace the entire block from `export const department = pgTable(...)` through the end of `export type Task = ...` (lines 216–322) with the following. Leave `taskExecution`, `taskExecutionEvent`, `agentMemory`, and the enums you still use intact. (Note: keep `agentMemorySourceEnum`, `taskStatusEnum`, `taskPriorityEnum`, `executionStatusEnum`.)

```typescript
// ─── Agent X ────────────────────────────────────────────────────────────────

export const agent = pgTable('agent', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').default(''),
  team: text('team'), // lightweight label, e.g. "数据组"; replaces department
  avatarSeed: text('avatarSeed'),
  avatarStyle: text('avatarStyle'),
  systemPrompt: text('systemPrompt').default(''),
  toolAllowList: jsonb('toolAllowList').$type<string[]>().default([]),
  skillSlugs: jsonb('skillSlugs').$type<string[]>().default([]),
  mcpServerNames: jsonb('mcpServerNames').$type<string[]>().default([]),
  model: text('model'),
  provider: text('provider'),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type Agent = InferSelectModel<typeof agent>

export const agentMemorySourceEnum = pgEnum('agent_memory_source', [
  'conversation',
  'task',
  'system'
])

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  source: agentMemorySourceEnum('source').notNull().default('task'),
  confidence: real('confidence').default(0.8),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type AgentMemory = InferSelectModel<typeof agentMemory>

// ─── Conversations (work groups) ──────────────────────────────────────────────

export const conversation = pgTable(
  'conversation',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    title: text('title').notNull(),
    icon: text('icon'), // emoji
    memberAgentIds: jsonb('memberAgentIds').$type<string[]>().default([]),
    archived: boolean('archived').default(false),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
    lastMessageAt: timestamp('lastMessageAt').defaultNow().notNull()
  },
  (table) => [index('conversation_last_message_idx').on(table.lastMessageAt)]
)

export type Conversation = InferSelectModel<typeof conversation>

export const conversationMessageRoleEnum = pgEnum('conversation_message_role', [
  'user',
  'pm',
  'employee',
  'system'
])

export const conversationMessage = pgTable(
  'conversation_message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    conversationId: uuid('conversationId')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    role: conversationMessageRoleEnum('role').notNull(),
    agentId: uuid('agentId').references(() => agent.id, {
      onDelete: 'set null'
    }),
    content: text('content').notNull().default(''),
    parts: jsonb('parts').$type<Record<string, unknown>[]>(), // tool-call cards etc.
    taskId: uuid('taskId'),
    createdAt: timestamp('createdAt').defaultNow().notNull()
  },
  (table) => [
    index('conversation_message_conv_idx').on(
      table.conversationId,
      table.createdAt
    )
  ]
)

export type ConversationMessage = InferSelectModel<typeof conversationMessage>

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'waiting_for_user'
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent'
])

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
  assignedAgentId: uuid('assignedAgentId').references(() => agent.id),
  input: jsonb('input').$type<Record<string, unknown>>(),
  output: jsonb('output').$type<Record<string, unknown>>(),
  maxRetries: real('maxRetries').default(1),
  retryCount: real('retryCount').default(0),
  cronExpression: text('cronExpression'),
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

export type Task = InferSelectModel<typeof task>
```

- [ ] **Step 2: Widen `taskExecution.tokenUsage` $type to carry cost**

In the existing `taskExecution` table definition, change the `tokenUsage` column type so it can also hold the computed cost (jsonb is schemaless — no migration needed for the widening, but the column must still appear in the diff if column ordering changed; it won't here):

```typescript
tokenUsage: jsonb('tokenUsage').$type<{
  inputTokens: number
  outputTokens: number
  cost?: number
}>()
```

- [ ] **Step 3: Add the knowledge_doc table**

Append after the `taskExecutionEvent` table:

```typescript
// ─── Knowledge Base (RAG stub) ────────────────────────────────────────────────

export const knowledgeDoc = pgTable('knowledge_doc', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull()
})

export type KnowledgeDoc = InferSelectModel<typeof knowledgeDoc>
```

- [ ] **Step 4: Typecheck the node side (will surface every dropped-field reference)**

Run: `pnpm typecheck:node`
Expected: FAIL with errors in `agent-x-queries.ts`, `execution-engine.ts`, `smart-dispatch.ts`, `auto-router.ts`, `auto-fill.ts`, `scheduler.ts`, `agent-x-crud.ts` referencing `department`, `assignedDepartmentId`, `isShadow`, `collaboratorIds`, `position`. **This is expected** — those files are rewritten/retired in later tasks. Note the list; do not fix yet.

- [ ] **Step 5: Commit (schema only)**

```bash
git add src/main/lib/db/schema.ts
git commit -m "feat(agent-x): drop department, add conversation/message/knowledge schema"
```

### Task 1.2: Generate the migration

**Files:**

- Create: `resources/drizzle/0005_*.sql` (+ `meta/_journal.json` update — generated)

- [ ] **Step 1: Generate**

Run: `pnpm db:generate`
Expected: a new `resources/drizzle/0005_<name>.sql` appears and `_journal.json` gains an `idx: 5` entry.

- [ ] **Step 2: Inspect the generated SQL**

Run: `git diff --stat resources/drizzle && sed -n '1,200p' resources/drizzle/0005_*.sql`
Expected to see: `DROP TABLE "department"`; `ALTER TABLE "agent"` dropping `departmentId/position/collaboratorIds/isShadow/shadowOfAgentId` and adding `team/avatarSeed/avatarStyle`; `ALTER TABLE "task"` dropping `assignedDepartmentId` and adding `conversationId`; `CREATE TABLE "conversation"`, `"conversation_message"`, `"knowledge_doc"`; new enum `conversation_message_role`.

> If drizzle-kit emits interactive rename prompts, choose **create/drop** (not rename) — this is a destructive dev migration per spec §11.

- [ ] **Step 3: Commit**

```bash
git add resources/drizzle
git commit -m "feat(agent-x): generate migration for chat redesign schema"
```

---

# Phase 2 — Backend

### Task 2.1: Conversation + message queries

**Files:**

- Create: `src/main/lib/db/conversation-queries.ts`
- Test: `src/main/lib/db/conversation-queries.test.ts`

- [ ] **Step 1: Write the failing test** (mock `db`, assert call shapes)

```typescript
// src/main/lib/db/conversation-queries.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertReturning = vi.fn()
const updateReturning = vi.fn()
const selectChain = vi.fn()

vi.mock('./db', () => ({
  db: {
    insert: () => ({ values: () => ({ returning: insertReturning }) }),
    update: () => ({
      set: () => ({ where: () => ({ returning: updateReturning }) })
    }),
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: selectChain }),
        orderBy: selectChain
      })
    })
  }
}))

const queries = await import('./conversation-queries')

describe('conversation-queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createConversation returns the inserted row', async () => {
    insertReturning.mockResolvedValue([{ id: 'c1', title: 'Group' }])
    const row = await queries.createConversation({ title: 'Group' })
    expect(row).toEqual({ id: 'c1', title: 'Group' })
  })

  it('addMemberToConversation merges without duplicates', async () => {
    // getConversationById returns current members
    vi.spyOn(queries, 'getConversationById').mockResolvedValue({
      id: 'c1',
      memberAgentIds: ['a1']
    } as never)
    updateReturning.mockResolvedValue([
      { id: 'c1', memberAgentIds: ['a1', 'a2'] }
    ])
    const row = await queries.addMemberToConversation('c1', 'a2')
    expect(row.memberAgentIds).toContain('a2')
    expect(row.memberAgentIds.filter((m: string) => m === 'a1')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/db/conversation-queries.test.ts`
Expected: FAIL — cannot find module `./conversation-queries`.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/db/conversation-queries.ts
import { asc, desc, eq } from 'drizzle-orm'

import { db } from './db'
import { conversation, conversationMessage, type Conversation } from './schema'

// ─── Conversation ─────────────────────────────────────────────────────────────

export async function getAllConversations() {
  return db
    .select()
    .from(conversation)
    .orderBy(desc(conversation.lastMessageAt))
}

export async function getConversationById(id: string) {
  const [row] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
  return row
}

export async function createConversation(
  data: typeof conversation.$inferInsert
) {
  const [row] = await db.insert(conversation).values(data).returning()
  return row
}

export async function updateConversation(
  id: string,
  data: Partial<typeof conversation.$inferInsert>
) {
  const [row] = await db
    .update(conversation)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversation.id, id))
    .returning()
  return row
}

export async function touchConversation(id: string) {
  const now = new Date()
  const [row] = await db
    .update(conversation)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversation.id, id))
    .returning()
  return row
}

export async function addMemberToConversation(
  conversationId: string,
  agentId: string
) {
  const current = await getConversationById(conversationId)
  const members = new Set<string>(
    (current?.memberAgentIds as string[] | null) ?? []
  )
  members.add(agentId)
  const [row] = await db
    .update(conversation)
    .set({ memberAgentIds: [...members], updatedAt: new Date() })
    .where(eq(conversation.id, conversationId))
    .returning()
  return row as Conversation & { memberAgentIds: string[] }
}

// ─── Conversation messages ────────────────────────────────────────────────────

export async function getMessagesByConversationId(conversationId: string) {
  return db
    .select()
    .from(conversationMessage)
    .where(eq(conversationMessage.conversationId, conversationId))
    .orderBy(asc(conversationMessage.createdAt))
}

export async function createConversationMessage(
  data: typeof conversationMessage.$inferInsert
) {
  const [row] = await db.insert(conversationMessage).values(data).returning()
  // Bump the parent conversation so it sorts to the top of the list.
  await touchConversation(data.conversationId)
  return row
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/db/conversation-queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/db/conversation-queries.ts src/main/lib/db/conversation-queries.test.ts
git commit -m "feat(agent-x): add conversation and message queries"
```

### Task 2.2: Knowledge base queries + substring search

**Files:**

- Create: `src/main/lib/db/knowledge-queries.ts`
- Test: `src/main/lib/db/knowledge-queries.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/db/knowledge-queries.test.ts
import { describe, expect, it, vi } from 'vitest'

const rows = [
  { id: 'd1', title: 'Onboarding', content: 'How to set up the laptop' },
  { id: 'd2', title: 'Security', content: 'Use the VPN for laptop access' }
]

vi.mock('./db', () => ({
  db: {
    select: () => ({ from: () => ({ orderBy: async () => rows }) })
  }
}))

const { searchKnowledgeDocs } = await import('./knowledge-queries')

describe('searchKnowledgeDocs', () => {
  it('matches on title or content, case-insensitive', async () => {
    const hits = await searchKnowledgeDocs('LAPTOP')
    expect(hits.map((h) => h.id).sort()).toEqual(['d1', 'd2'])
  })

  it('returns empty array on no match', async () => {
    expect(await searchKnowledgeDocs('nonexistent')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/db/knowledge-queries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/db/knowledge-queries.ts
import { desc, eq } from 'drizzle-orm'

import { db } from './db'
import { knowledgeDoc } from './schema'

export async function getAllKnowledgeDocs() {
  return db.select().from(knowledgeDoc).orderBy(desc(knowledgeDoc.updatedAt))
}

export async function createKnowledgeDoc(
  data: typeof knowledgeDoc.$inferInsert
) {
  const [row] = await db.insert(knowledgeDoc).values(data).returning()
  return row
}

export async function updateKnowledgeDoc(
  id: string,
  data: Partial<typeof knowledgeDoc.$inferInsert>
) {
  const [row] = await db
    .update(knowledgeDoc)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(knowledgeDoc.id, id))
    .returning()
  return row
}

export async function deleteKnowledgeDoc(id: string) {
  return db.delete(knowledgeDoc).where(eq(knowledgeDoc.id, id))
}

/**
 * STUB retrieval — naive case-insensitive substring match over title/content.
 * Signature & return shape mirror a future embedding search so callers won't
 * change when real RAG replaces this.
 */
export async function searchKnowledgeDocs(
  query: string
): Promise<Array<{ id: string; title: string; snippet: string }>> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const docs = await getAllKnowledgeDocs()
  return docs
    .filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    )
    .map((d) => ({
      id: d.id,
      title: d.title,
      snippet: d.content.slice(0, 280)
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/db/knowledge-queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/db/knowledge-queries.ts src/main/lib/db/knowledge-queries.test.ts
git commit -m "feat(agent-x): add knowledge base queries with stub search"
```

### Task 2.3: Neutral name pool

**Files:**

- Create: `src/main/lib/ai/agent-x/names.ts`
- Test: `src/main/lib/ai/agent-x/names.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/ai/agent-x/names.test.ts
import { describe, expect, it } from 'vitest'
import { NAME_POOL, pickName } from './names'

describe('pickName', () => {
  it('returns a name from the pool', () => {
    expect(NAME_POOL).toContain(pickName())
  })

  it('avoids names already taken when possible', () => {
    const taken = NAME_POOL.slice(0, NAME_POOL.length - 1)
    expect(pickName(taken)).toBe(NAME_POOL[NAME_POOL.length - 1])
  })

  it('falls back to a suffixed name when all are taken', () => {
    const name = pickName(NAME_POOL)
    expect(name).toMatch(/\d+$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/names.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/names.ts
// Gender-neutral, culturally-mixed pool for auto-named employees.
export const NAME_POOL = [
  'Avery',
  'Riley',
  'Quinn',
  'Jordan',
  'Sage',
  'Reese',
  'Rowan',
  'Morgan',
  'Kai',
  'Nova',
  'Eden',
  'Tate',
  'Skyler',
  'Lane',
  'Hayden',
  'Emery'
] as const

/** Pick a name not already in `taken`; if all are taken, suffix with a number. */
export function pickName(taken: readonly string[] = []): string {
  const available = NAME_POOL.filter((n) => !taken.includes(n))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  const base = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)]
  let i = 2
  while (taken.includes(`${base} ${i}`)) i++
  return `${base} ${i}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/names.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/names.ts src/main/lib/ai/agent-x/names.test.ts
git commit -m "feat(agent-x): add neutral name pool for auto-recruited employees"
```

### Task 2.4: Recruit helper (`autoCreateEmployee`)

**Files:**

- Create: `src/main/lib/ai/agent-x/recruit.ts`
- Test: `src/main/lib/ai/agent-x/recruit.test.ts`

This replaces `smart-dispatch.ts`'s `autoCreateAgent`. It generates a name (if absent), random avatar seed/style, and persists an active employee.

- [ ] **Step 1: Write the failing test** (mock LLM + queries)

```typescript
// src/main/lib/ai/agent-x/recruit.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@mariozechner/pi-ai', () => ({
  completeSimple: vi.fn(async () => ({
    content: [
      {
        type: 'text',
        text: '{"name":"","description":"Crunches numbers","systemPrompt":"You analyze data."}'
      }
    ]
  }))
}))
vi.mock('../../db/queries', () => ({ getSettings: async () => ({ id: 's' }) }))
vi.mock('../utils/chat-message-util', () => ({
  getModelFromProvider: () => ({ chatModel: {}, apiKey: 'k' })
}))
const createAgent = vi.fn(async (d) => ({ id: 'a1', ...d }))
const getAllAgents = vi.fn(async () => [{ name: 'Avery' }])
vi.mock('../../db/agent-x-queries', () => ({ createAgent, getAllAgents }))

const { autoCreateEmployee } = await import('./recruit')

describe('autoCreateEmployee', () => {
  it('fills a name from the pool when LLM returns none, and sets avatar seed', async () => {
    const emp = await autoCreateEmployee({
      role: 'Data analyst',
      skills: ['python']
    })
    expect(createAgent).toHaveBeenCalled()
    const arg = createAgent.mock.calls[0][0]
    expect(arg.name).toBeTruthy()
    expect(arg.name).not.toBe('Avery') // avoided the taken name
    expect(arg.avatarSeed).toMatch(/^[a-z0-9]+$/i)
    expect(arg.avatarStyle).toBeTruthy()
    expect(arg.isActive).toBe(true)
  })

  it('honors an explicit name', async () => {
    await autoCreateEmployee({ role: 'Writer', name: 'Pat' })
    const arg = createAgent.mock.calls.at(-1)![0]
    expect(arg.name).toBe('Pat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/recruit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/recruit.ts
import { completeSimple } from '@mariozechner/pi-ai'
import {
  DEFAULT_AVATAR_STYLE,
  randomAvatarSeed
} from '@shared/constants/avatar'

import { createAgent, getAllAgents } from '../../db/agent-x-queries'
import { getSettings } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'
import { pickName } from './names'

const SPEC_PROMPT = `You are designing a virtual employee for a group-chat team. Given a role and optional skills, produce a JSON spec.
Respond with ONLY a JSON object (no markdown):
{"name":"","description":"...","systemPrompt":"..."}
Leave "name" empty — it is assigned separately.`

export interface RecruitParams {
  role: string
  skills?: string[]
  name?: string
  team?: string
}

/** Create and persist a new employee. Reused by the PM `recruitEmployee` tool. */
export async function autoCreateEmployee(params: RecruitParams) {
  const setting = await getSettings()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  let description = `Virtual employee for: ${params.role}`
  let systemPrompt = `You are a virtual employee. Your role: ${params.role}.`

  try {
    const result = await completeSimple(
      chatModel,
      {
        systemPrompt: SPEC_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Role: ${params.role}\nSkills: ${(params.skills ?? []).join(', ') || 'none specified'}`
              }
            ],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey }
    )
    const text = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const spec = JSON.parse(match[0]) as {
        description?: string
        systemPrompt?: string
      }
      description = spec.description || description
      systemPrompt = spec.systemPrompt || systemPrompt
    }
  } catch {
    // fall back to defaults
  }

  const existing = await getAllAgents()
  const name = params.name ?? pickName(existing.map((a) => a.name))

  return createAgent({
    name,
    description,
    systemPrompt,
    team: params.team ?? null,
    avatarSeed: randomAvatarSeed(),
    avatarStyle: DEFAULT_AVATAR_STYLE,
    skillSlugs: params.skills ?? [],
    mcpServerNames: [],
    toolAllowList: [],
    isActive: true
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/recruit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/recruit.ts src/main/lib/ai/agent-x/recruit.test.ts
git commit -m "feat(agent-x): add employee recruit helper with auto-name and avatar"
```

### Task 2.5: Extend SSE event types

**Files:**

- Modify: `src/shared/types/agent-x.ts`
- Test: `src/shared/types/agent-x.test.ts`

- [ ] **Step 1: Write the failing test** (type-level + role enum value check)

```typescript
// src/shared/types/agent-x.test.ts
import { describe, expect, it } from 'vitest'
import { CONVERSATION_MESSAGE_ROLES, type AgentXSseEvent } from './agent-x'

describe('agent-x shared types', () => {
  it('lists the four conversation roles', () => {
    expect(CONVERSATION_MESSAGE_ROLES).toEqual([
      'user',
      'pm',
      'employee',
      'system'
    ])
  })

  it('accepts the new conversation SSE events (compile-time)', () => {
    const events: AgentXSseEvent[] = [
      {
        type: 'message_start',
        conversationId: 'c',
        role: 'employee',
        agentId: 'a',
        messageId: 'm'
      },
      {
        type: 'message_delta',
        conversationId: 'c',
        messageId: 'm',
        delta: 'hi'
      },
      { type: 'message_end', conversationId: 'c', messageId: 'm' },
      { type: 'member_joined', conversationId: 'c', agentId: 'a' },
      { type: 'round_start', conversationId: 'c', label: '[定时] X' }
    ]
    expect(events).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/types/agent-x.test.ts`
Expected: FAIL — `CONVERSATION_MESSAGE_ROLES` not exported and new event arms don't typecheck.

- [ ] **Step 3: Implement — add roles + new event arms**

Add to `src/shared/types/agent-x.ts`:

```typescript
export const CONVERSATION_MESSAGE_ROLES = [
  'user',
  'pm',
  'employee',
  'system'
] as const
export type ConversationMessageRole =
  (typeof CONVERSATION_MESSAGE_ROLES)[number]
```

Extend the `AgentXSseEvent` union with these arms (append before the closing of the union):

```typescript
  | {
      type: 'message_start'
      conversationId: string
      messageId: string
      role: ConversationMessageRole
      agentId?: string
    }
  | {
      type: 'message_delta'
      conversationId: string
      messageId: string
      delta: string
    }
  | {
      type: 'message_end'
      conversationId: string
      messageId: string
    }
  | {
      type: 'tool_card'
      conversationId: string
      messageId: string
      toolName: string
      phase: 'start' | 'end'
      result?: unknown
    }
  | { type: 'member_joined'; conversationId: string; agentId: string }
  | { type: 'round_start'; conversationId: string; label: string }
  | {
      type: 'ask_user'
      conversationId: string
      question: string
      options: string[]
    }
  | { type: 'conversation_error'; conversationId: string; error: string }
```

> Keep the existing task-based arms for now; they are removed when the timeline/task UI is deleted in Phase 3.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/shared/types/agent-x.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/agent-x.ts src/shared/types/agent-x.test.ts
git commit -m "feat(agent-x): extend SSE events for conversation streaming"
```

### Task 2.6: Conversation SSE topic helpers

**Files:**

- Modify: `src/main/lib/server/routes/agent-x-sse.ts`

- [ ] **Step 1: Add a conversation emitter + endpoint**

Add to `agent-x-sse.ts` (keep the existing task helpers):

```typescript
// Emit a conversation-scoped event to clients watching that conversation.
export function emitToConversation(
  conversationId: string,
  event: AgentXSseEvent
): void {
  const payload = sseManager.encodeEvent(event)
  sseManager.emitRaw(conversationId, payload)
  sseManager.emitGlobalRaw(payload)
}
```

And register the route inside `agentXSse`:

```typescript
agentXSse.get('/conversations/:id/sse', (c) => {
  const id = getRequiredParam(c, 'id')
  const stream = new ReadableStream({
    start(controller) {
      sseManager.register(id, controller, c.req.raw.signal)
    }
  })
  return new Response(stream, { headers: SSE_HEADERS })
})
```

- [ ] **Step 2: Re-export from `agent-x.ts`**

In `src/main/lib/server/routes/agent-x.ts`, extend the re-export line:

```typescript
export { emitToAll, emitToTask, emitToConversation } from './agent-x-sse'
```

- [ ] **Step 3: Verify it compiles in isolation**

Run: `pnpm typecheck:node 2>&1 | grep -E "agent-x-sse|agent-x\.ts"`
Expected: no errors originating from these two files (other files still error from Phase 1 — that's fine).

- [ ] **Step 4: Commit**

```bash
git add src/main/lib/server/routes/agent-x-sse.ts src/main/lib/server/routes/agent-x.ts
git commit -m "feat(agent-x): add conversation-scoped SSE channel"
```

### Task 2.7: Knowledge base tool (`searchKnowledgeBase`)

**Files:**

- Create: `src/main/lib/ai/agent-x/kb-tools.ts`
- Test: `src/main/lib/ai/agent-x/kb-tools.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/ai/agent-x/kb-tools.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../db/knowledge-queries', () => ({
  searchKnowledgeDocs: vi.fn(async (q: string) =>
    q === 'vpn' ? [{ id: 'd2', title: 'Security', snippet: 'Use the VPN' }] : []
  )
}))

const { createSearchKnowledgeBaseTool } = await import('./kb-tools')

describe('searchKnowledgeBase tool', () => {
  it('returns formatted hits', async () => {
    const tool = createSearchKnowledgeBaseTool()
    const res = await tool.execute('id', { query: 'vpn' })
    expect(JSON.stringify(res)).toContain('Security')
  })

  it('reports no results gracefully', async () => {
    const tool = createSearchKnowledgeBaseTool()
    const res = await tool.execute('id', { query: 'absent' })
    expect(JSON.stringify(res).toLowerCase()).toContain('no')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/kb-tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/kb-tools.ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

import { searchKnowledgeDocs } from '../../db/knowledge-queries'

/** Shared company knowledge base search. STUB today; RAG-shaped for the future. */
export function createSearchKnowledgeBaseTool(): AgentTool {
  return {
    name: 'searchKnowledgeBase',
    label: 'Search Knowledge Base',
    description:
      'Search the shared company knowledge base for relevant documents. Use before asking the user about company-specific facts.',
    parameters: Type.Object({
      query: Type.String({ description: 'What to look up' })
    }),
    execute: async (_id: string, params: { query: string }) => {
      const hits = await searchKnowledgeDocs(params.query)
      const text =
        hits.length === 0
          ? `No knowledge base documents matched "${params.query}".`
          : hits
              .map((h, i) => `${i + 1}. ${h.title}\n${h.snippet}`)
              .join('\n\n')
      return {
        content: [{ type: 'text' as const, text }],
        details: { query: params.query, hits }
      }
    }
  } as AgentTool
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/kb-tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/kb-tools.ts src/main/lib/ai/agent-x/kb-tools.test.ts
git commit -m "feat(agent-x): add searchKnowledgeBase tool (stub)"
```

### Task 2.8: Employee loop (rewrite execution-engine)

**Files:**

- Create: `src/main/lib/ai/agent-x/employee-loop.ts`
- Modify: `src/main/lib/ai/agent-x/execution-engine.ts` (becomes a re-export shim)
- Test: `src/main/lib/ai/agent-x/employee-loop.test.ts`

This is the core engine change: skills/MCP come from the **agent itself** (no department); the loop captures token usage from `message_end`; output/tool calls stream into the conversation via `emitToConversation`; the final employee message is persisted as a `conversationMessage` with `role:'employee'`.

- [ ] **Step 1: Write the failing test** (focus on tools sourced from agent + usage capture; mock `agentLoop`)

```typescript
// src/main/lib/ai/agent-x/employee-loop.test.ts
import { describe, expect, it, vi } from 'vitest'

const agentLoopMock = vi.fn()
vi.mock('@mariozechner/pi-agent-core', () => ({
  agentLoop: (...args: unknown[]) => agentLoopMock(...args)
}))
vi.mock('@mariozechner/pi-ai', () => ({}))
vi.mock('../../db/queries', () => ({ getSettings: async () => ({ id: 's' }) }))
vi.mock('../utils/chat-message-util', () => ({
  getModelFromProvider: () => ({
    chatModel: { cost: { input: 1, output: 2 } },
    apiKey: 'k'
  }),
  bindCallingTools: () => []
}))
vi.mock('../mcp', () => ({
  getMcpTools: async () => [],
  getMcpToolsByNames: async () => []
}))
vi.mock('../skills/skills-manager', () => ({
  getActiveSkillsContent: async () => '',
  getSkillsContentBySlugs: async () => 'SKILL-X'
}))
const updateTaskExecution = vi.fn()
vi.mock('../../db/agent-x-queries', () => ({
  updateTaskExecution,
  createTaskExecutionEvent: vi.fn()
}))

const { runEmployeeLoop } = await import('./employee-loop')

function fakeStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e
    }
  }
}

describe('runEmployeeLoop', () => {
  it('uses the agent skills (not a department) and captures usage', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'done' }],
            usage: { input: 100, output: 50 }
          }
        }
      ])
    )
    const emit = vi.fn()
    const out = await runEmployeeLoop({
      agent: {
        id: 'a',
        name: 'Avery',
        skillSlugs: ['x'],
        mcpServerNames: [],
        toolAllowList: []
      } as never,
      instructions: 'do it',
      executionId: 'e1',
      conversationId: 'c1',
      emit
    })
    expect(out).toBe('done')
    // usage written to execution
    expect(updateTaskExecution).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        tokenUsage: expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50
        })
      })
    )
    // streamed a message_end conversation event
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message_end', conversationId: 'c1' })
    )
  })

  it('throws on stopReason error (no silent empty message)', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [],
            stopReason: 'error',
            errorMessage: 'boom'
          }
        }
      ])
    )
    await expect(
      runEmployeeLoop({
        agent: {
          id: 'a',
          name: 'A',
          skillSlugs: [],
          mcpServerNames: [],
          toolAllowList: []
        } as never,
        instructions: 'x',
        executionId: 'e',
        conversationId: 'c',
        emit: vi.fn()
      })
    ).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/employee-loop.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `employee-loop.ts`**

```typescript
// src/main/lib/ai/agent-x/employee-loop.ts
import type { AgentMessage, AgentTool } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message, Usage } from '@mariozechner/pi-ai'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import { v4 as uuidV4 } from 'uuid'

import {
  createTaskExecutionEvent,
  updateTaskExecution
} from '../../db/agent-x-queries'
import { getSettings } from '../../db/queries'
import type { Agent } from '../../db/schema'
import { calculateCost } from '../utils/cost'
import { getMcpTools, getMcpToolsByNames } from '../mcp'
import {
  getActiveSkillsContent,
  getSkillsContentBySlugs
} from '../skills/skills-manager'
import {
  bindCallingTools,
  getModelFromProvider
} from '../utils/chat-message-util'

export type SseEmitter = (event: AgentXSseEvent) => void

export interface RunEmployeeLoopArgs {
  agent: Agent
  instructions: string
  executionId: string
  conversationId: string
  emit: SseEmitter
  /** Extra tools (e.g. none for employees in v1). */
  extraTools?: AgentTool[]
  signal?: AbortSignal
}

function buildEmployeeSystemPrompt(agent: Agent): string {
  const parts = [`You are "${agent.name}", a virtual employee on a team.`]
  if (agent.team) parts.push(`Team: ${agent.team}`)
  if (agent.description) parts.push(`Role: ${agent.description}`)
  if (agent.systemPrompt) parts.push(agent.systemPrompt)
  parts.push(
    '\nYou were given a task by the team PM. Use your tools to complete it.',
    'When finished, give a clear, self-contained summary of what you did and the result.'
  )
  return parts.join('\n\n')
}

/**
 * Run a single employee's agent loop. Tools/skills/MCP come from the AGENT
 * (no department). Streams bubbles into the conversation, persists usage on the
 * execution row, and returns the final text output.
 */
export async function runEmployeeLoop(
  args: RunEmployeeLoopArgs
): Promise<string> {
  const { agent, instructions, executionId, conversationId, emit, signal } =
    args
  const setting = await getSettings()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  const mcpNames = (agent.mcpServerNames as string[] | null) ?? []
  const mcpTools =
    mcpNames.length > 0
      ? await getMcpToolsByNames(mcpNames)
      : await getMcpTools()
  const allTools = bindCallingTools({ advancedTools: [], setting, mcpTools })

  const allowList = (agent.toolAllowList as string[] | null) ?? []
  let tools =
    allowList.length > 0
      ? allTools.filter((t) => allowList.includes(t.name))
      : allTools
  if (args.extraTools?.length) tools = [...tools, ...args.extraTools]

  const skillSlugs = (agent.skillSlugs as string[] | null) ?? []
  const skillsContent =
    skillSlugs.length > 0
      ? await getSkillsContentBySlugs(skillSlugs)
      : await getActiveSkillsContent()
  const systemPrompt = buildEmployeeSystemPrompt(agent) + skillsContent

  const userMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: instructions }],
    timestamp: Date.now()
  }

  const messageId = uuidV4()
  emit({
    type: 'message_start',
    conversationId,
    messageId,
    role: 'employee',
    agentId: agent.id
  })

  let finalOutput = ''
  let totalInput = 0
  let totalOutput = 0
  let lastUsage: Usage | undefined

  const stream = agentLoop(
    [userMessage as AgentMessage],
    { systemPrompt, messages: [], tools },
    {
      model: chatModel,
      apiKey,
      convertToLlm: (msgs: AgentMessage[]): Message[] =>
        msgs.filter(
          (m): m is Message =>
            (m as Message).role === 'user' ||
            (m as Message).role === 'assistant' ||
            (m as Message).role === 'toolResult'
        )
    },
    signal
  )

  for await (const event of stream) {
    if (event.type === 'message_update') {
      const msg = event.message as Message
      if (msg.role !== 'assistant') continue
      const text = msg.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('')
      finalOutput = text
      emit({ type: 'message_delta', conversationId, messageId, delta: text })
    } else if (event.type === 'message_end') {
      const msg = event.message as Message & { role: 'assistant' }
      if (msg.role === 'assistant') {
        if (msg.stopReason === 'error') {
          throw new Error(
            msg.errorMessage || 'The model returned an error without details.'
          )
        }
        if (msg.usage) {
          lastUsage = msg.usage
          totalInput += msg.usage.input ?? 0
          totalOutput += msg.usage.output ?? 0
        }
      }
    } else if (event.type === 'tool_execution_start') {
      emit({
        type: 'tool_card',
        conversationId,
        messageId,
        toolName: event.toolName,
        phase: 'start'
      })
      await createTaskExecutionEvent({
        executionId,
        eventType: 'tool_start',
        payload: { toolName: event.toolName }
      })
    } else if (event.type === 'tool_execution_end') {
      const result =
        event.result &&
        typeof event.result === 'object' &&
        'details' in event.result
          ? event.result.details
          : event.result
      emit({
        type: 'tool_card',
        conversationId,
        messageId,
        toolName: event.toolName,
        phase: 'end',
        result
      })
      await createTaskExecutionEvent({
        executionId,
        eventType: 'tool_end',
        payload: {
          toolName: event.toolName,
          result: typeof result === 'string' ? result : JSON.stringify(result)
        }
      })
    }
  }

  const cost = calculateCost(lastUsage, chatModel).total
  await updateTaskExecution(executionId, {
    status: 'completed',
    completedAt: new Date(),
    tokenUsage: { inputTokens: totalInput, outputTokens: totalOutput, cost }
  })

  emit({ type: 'message_end', conversationId, messageId })
  return finalOutput
}
```

> Note: cost uses the last turn's usage rate; tokens are summed across turns. Good enough for v1 Costs.

- [ ] **Step 4: Replace `execution-engine.ts` with a thin shim**

The old `executeTask`/`handleDelegation` are superseded by the PM coordinator + employee loop. Replace `execution-engine.ts` entirely with a delegation-execution helper used by the PM (creates the execution row + runs the loop):

```typescript
// src/main/lib/ai/agent-x/execution-engine.ts
import {
  createTaskExecution,
  getAgentById,
  updateTask
} from '../../db/agent-x-queries'
import { runEmployeeLoop, type SseEmitter } from './employee-loop'

/**
 * Run one delegated employee task end-to-end: mark running, create the
 * execution row, run the employee loop, mark completed/failed. Returns the
 * employee's final text output for the PM to review.
 */
export async function runDelegatedTask(args: {
  taskId: string
  agentId: string
  conversationId: string
  instructions: string
  emit: SseEmitter
  signal?: AbortSignal
}): Promise<string> {
  const { taskId, agentId, conversationId, instructions, emit, signal } = args
  const agent = await getAgentById(agentId)
  if (!agent) throw new Error(`Agent ${agentId} not found`)

  await updateTask(taskId, { status: 'running' })
  const execution = await createTaskExecution({
    taskId,
    agentId,
    status: 'running',
    error: null,
    tokenUsage: null
  })

  try {
    const output = await runEmployeeLoop({
      agent,
      instructions,
      executionId: execution.id,
      conversationId,
      emit,
      signal
    })
    await updateTask(taskId, {
      status: 'completed',
      output: { result: output },
      completedAt: new Date()
    })
    return output
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const { updateTaskExecution } = await import('../../db/agent-x-queries')
    await updateTaskExecution(execution.id, {
      status: 'failed',
      completedAt: new Date(),
      error: message
    })
    await updateTask(taskId, { status: 'failed' })
    throw err
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/employee-loop.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/lib/ai/agent-x/employee-loop.ts src/main/lib/ai/agent-x/employee-loop.test.ts src/main/lib/ai/agent-x/execution-engine.ts
git commit -m "feat(agent-x): employee loop sources skills from agent, captures usage"
```

### Task 2.9: PM tools (delegate / recruit / askUser)

**Files:**

- Create: `src/main/lib/ai/agent-x/pm-tools.ts`
- Test: `src/main/lib/ai/agent-x/pm-tools.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/ai/agent-x/pm-tools.test.ts
import { describe, expect, it, vi } from 'vitest'
vi.mock('@mariozechner/pi-ai', () => ({
  Type: {
    Object: (o: unknown) => o,
    String: (o?: unknown) => o ?? {},
    Array: (t: unknown, o?: unknown) => o ?? {}
  }
}))

const { createDelegateTaskTool, createRecruitEmployeeTool } =
  await import('./pm-tools')

describe('pm-tools', () => {
  it('delegate tool lists the roster and calls the callback', async () => {
    const onDelegate = vi.fn(async () => 'employee result')
    const tool = createDelegateTaskTool(
      [{ id: 'a1', name: 'Avery', description: 'Analyst' }],
      onDelegate
    )
    expect(tool.description).toContain('Avery')
    const res = await tool.execute('id', {
      employeeId: 'a1',
      instructions: 'go'
    })
    expect(onDelegate).toHaveBeenCalledWith({
      employeeId: 'a1',
      instructions: 'go'
    })
    expect(JSON.stringify(res)).toContain('employee result')
  })

  it('recruit tool calls the callback and returns the new employee id', async () => {
    const onRecruit = vi.fn(async () => ({ id: 'a2', name: 'Quinn' }))
    const tool = createRecruitEmployeeTool(onRecruit)
    const res = await tool.execute('id', { role: 'Writer', skills: [] })
    expect(onRecruit).toHaveBeenCalled()
    expect(JSON.stringify(res)).toContain('a2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/pm-tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/pm-tools.ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

export function createDelegateTaskTool(
  roster: Array<{ id: string; name: string; description: string | null }>,
  onDelegate: (p: {
    employeeId: string
    instructions: string
  }) => Promise<string>
): AgentTool {
  const list = roster
    .map(
      (a) => `- ${a.name} (id: ${a.id}): ${a.description ?? 'no description'}`
    )
    .join('\n')
  return {
    name: 'delegateTask',
    label: 'Delegate Task',
    description: `Assign a sub-task to one employee and get their result back. Current employees:\n${list || '(none yet — recruit one first)'}`,
    parameters: Type.Object({
      employeeId: Type.String({ description: 'id of the employee to assign' }),
      instructions: Type.String({ description: 'clear, complete instructions' })
    }),
    execute: async (
      _id: string,
      p: { employeeId: string; instructions: string }
    ) => {
      const result = await onDelegate(p)
      return {
        content: [{ type: 'text' as const, text: result }],
        details: { employeeId: p.employeeId, result }
      }
    }
  } as AgentTool
}

export function createRecruitEmployeeTool(
  onRecruit: (p: { role: string; skills: string[]; name?: string }) => Promise<{
    id: string
    name: string
  }>
): AgentTool {
  return {
    name: 'recruitEmployee',
    label: 'Recruit Employee',
    description:
      'Create a new virtual employee when no current employee fits the work. They join the group immediately.',
    parameters: Type.Object({
      role: Type.String({ description: 'what this employee specializes in' }),
      skills: Type.Array(Type.String(), {
        description: 'skill slugs',
        default: []
      }),
      name: Type.String({
        description: 'optional name; auto-assigned if omitted',
        default: ''
      })
    }),
    execute: async (
      _id: string,
      p: { role: string; skills: string[]; name?: string }
    ) => {
      const emp = await onRecruit({
        role: p.role,
        skills: p.skills ?? [],
        name: p.name || undefined
      })
      return {
        content: [
          {
            type: 'text' as const,
            text: `Recruited ${emp.name} (id: ${emp.id}).`
          }
        ],
        details: emp
      }
    }
  } as AgentTool
}
```

> `askUser` reuses `createEscalateToUserTool` from `agent-tools.ts` — no new tool needed here.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/pm-tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/pm-tools.ts src/main/lib/ai/agent-x/pm-tools.test.ts
git commit -m "feat(agent-x): add PM delegate and recruit tools"
```

### Task 2.10: Ask-user pending registry

**Files:**

- Create: `src/main/lib/ai/agent-x/ask-user-registry.ts`
- Test: `src/main/lib/ai/agent-x/ask-user-registry.test.ts`

The PM's `askUser` tool blocks the loop on a promise keyed by conversationId; the `/respond` route resolves it.

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/ai/agent-x/ask-user-registry.test.ts
import { describe, expect, it } from 'vitest'
import { askUserRegistry } from './ask-user-registry'

describe('askUserRegistry', () => {
  it('resolves a waiting question with the provided answer', async () => {
    const pending = askUserRegistry.wait('c1')
    expect(askUserRegistry.has('c1')).toBe(true)
    askUserRegistry.resolve('c1', 'the answer')
    await expect(pending).resolves.toBe('the answer')
    expect(askUserRegistry.has('c1')).toBe(false)
  })

  it('resolve on unknown conversation is a no-op', () => {
    expect(() => askUserRegistry.resolve('nope', 'x')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/ask-user-registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/ask-user-registry.ts
type Resolver = (answer: string) => void

class AskUserRegistry {
  private pending = new Map<string, Resolver>()

  /** Returns a promise that resolves when the user answers for this conversation. */
  wait(conversationId: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.pending.set(conversationId, resolve)
    })
  }

  has(conversationId: string): boolean {
    return this.pending.has(conversationId)
  }

  resolve(conversationId: string, answer: string): void {
    const resolver = this.pending.get(conversationId)
    if (!resolver) return
    this.pending.delete(conversationId)
    resolver(answer)
  }
}

export const askUserRegistry = new AskUserRegistry()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/ask-user-registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/ask-user-registry.ts src/main/lib/ai/agent-x/ask-user-registry.test.ts
git commit -m "feat(agent-x): add ask-user pending registry for PM pause/resume"
```

### Task 2.11: PM coordinator

**Files:**

- Create: `src/main/lib/ai/agent-x/pm-coordinator.ts`
- Test: `src/main/lib/ai/agent-x/pm-coordinator.test.ts`

The PM runs its own `agentLoop`. It rebuilds context from prior conversation messages, exposes the four PM tools, persists its final message as `role:'pm'`, and emits PM bubbles. Delegation creates a child task + execution and runs the employee loop, returning the employee's output for PM review; the employee's final text is also persisted as a `role:'employee'` message. Recruit adds the new employee to `memberAgentIds` and emits `member_joined`.

- [ ] **Step 1: Write the failing test** (verify tool wiring + persistence; mock `agentLoop` and queries)

```typescript
// src/main/lib/ai/agent-x/pm-coordinator.test.ts
import { describe, expect, it, vi } from 'vitest'

const agentLoopMock = vi.fn()
vi.mock('@mariozechner/pi-agent-core', () => ({
  agentLoop: (...a: unknown[]) => agentLoopMock(...a)
}))
vi.mock('@mariozechner/pi-ai', () => ({
  Type: {
    Object: (o: unknown) => o,
    String: (o?: unknown) => o ?? {},
    Array: (_t: unknown, o?: unknown) => o ?? {}
  }
}))
vi.mock('../../db/queries', () => ({ getSettings: async () => ({ id: 's' }) }))
vi.mock('../utils/chat-message-util', () => ({
  getModelFromProvider: () => ({ chatModel: {}, apiKey: 'k' })
}))
const getActiveAgents = vi.fn(async () => [
  { id: 'a1', name: 'Avery', description: 'Analyst', isActive: true }
])
const createConversationMessage = vi.fn(async (d) => ({ id: 'm', ...d }))
const getMessagesByConversationId = vi.fn(async () => [])
vi.mock('../../db/agent-x-queries', () => ({ getActiveAgents }))
vi.mock('../../db/conversation-queries', () => ({
  createConversationMessage,
  getMessagesByConversationId,
  addMemberToConversation: vi.fn(async () => ({ memberAgentIds: ['a1'] }))
}))

function fakeStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e
    }
  }
}

const { runPmCoordinator } = await import('./pm-coordinator')

describe('runPmCoordinator', () => {
  it('persists the PM final message and emits bubbles', async () => {
    agentLoopMock.mockReturnValue(
      fakeStream([
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'All done — report ready.' }],
            usage: { input: 10, output: 5 }
          }
        }
      ])
    )
    const emit = vi.fn()
    await runPmCoordinator({
      conversationId: 'c1',
      userText: 'build a report',
      emit
    })
    expect(createConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'c1',
        role: 'pm',
        content: expect.stringContaining('report')
      })
    )
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message_start', role: 'pm' })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/pm-coordinator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/lib/ai/agent-x/pm-coordinator.ts
import type { AgentMessage, AgentTool } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import { v4 as uuidV4 } from 'uuid'

import { createTask, getActiveAgents } from '../../db/agent-x-queries'
import {
  addMemberToConversation,
  createConversationMessage,
  getMessagesByConversationId
} from '../../db/conversation-queries'
import { getSettings } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'
import { createEscalateToUserTool } from './agent-tools'
import { askUserRegistry } from './ask-user-registry'
import { runDelegatedTask } from './execution-engine'
import type { SseEmitter } from './employee-loop'
import { createSearchKnowledgeBaseTool } from './kb-tools'
import { createDelegateTaskTool, createRecruitEmployeeTool } from './pm-tools'
import { autoCreateEmployee } from './recruit'

const PM_SYSTEM_PROMPT = `You are the PM (project manager) of a virtual team working in a group chat.
Your job, every round:
1. Understand the user's request.
2. Decide which employees are needed. If an existing employee fits, delegate to them with delegateTask. If nobody fits, recruitEmployee first, then delegate.
3. After each employee returns, REVIEW their output against the goal. If it falls short, delegate again with specific corrections, or recruit/replace. This review-and-correct loop is mandatory — never pass along sub-par work.
4. When everything meets the goal, write ONE final message to the user that summarizes the outcome. Do not call any tool in that final turn.
Use searchKnowledgeBase for company-specific facts before asking the user. Use askUser only when truly blocked.
Delegate to one employee at a time.`

function rosterText(
  agents: { name: string; team: string | null; description: string | null }[]
): string {
  if (agents.length === 0) return '(no employees yet)'
  return agents
    .map(
      (a) =>
        `- ${a.name}${a.team ? ` [${a.team}]` : ''}: ${a.description ?? 'no description'}`
    )
    .join('\n')
}

/** Rebuild PM context from prior conversation messages. */
async function buildHistory(conversationId: string): Promise<Message[]> {
  const rows = await getMessagesByConversationId(conversationId)
  return rows.map((r) => ({
    role: r.role === 'user' ? 'user' : 'assistant',
    content: [{ type: 'text', text: r.content }],
    timestamp: new Date(r.createdAt).getTime()
  })) as Message[]
}

export interface RunPmArgs {
  conversationId: string
  userText: string
  emit: SseEmitter
  signal?: AbortSignal
}

export async function runPmCoordinator(args: RunPmArgs): Promise<void> {
  const { conversationId, userText, emit, signal } = args
  const setting = await getSettings()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  const employees = await getActiveAgents()
  const history = await buildHistory(conversationId)

  const tools: AgentTool[] = [
    createDelegateTaskTool(
      employees.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description
      })),
      async ({ employeeId, instructions }) => {
        const childTask = await createTask({
          conversationId,
          title: `Delegated: ${instructions.slice(0, 80)}`,
          description: instructions,
          status: 'pending',
          priority: 'medium',
          assignedAgentId: employeeId,
          input: null,
          output: null,
          maxRetries: 1,
          retryCount: 0
        })
        const output = await runDelegatedTask({
          taskId: childTask.id,
          agentId: employeeId,
          conversationId,
          instructions,
          emit,
          signal
        })
        // Persist the employee's final output as a chat bubble.
        await createConversationMessage({
          conversationId,
          role: 'employee',
          agentId: employeeId,
          content: output,
          taskId: childTask.id
        })
        return output
      }
    ),
    createRecruitEmployeeTool(async ({ role, skills, name }) => {
      const emp = await autoCreateEmployee({ role, skills, name })
      await addMemberToConversation(conversationId, emp.id)
      emit({ type: 'member_joined', conversationId, agentId: emp.id })
      return { id: emp.id, name: emp.name }
    }),
    createSearchKnowledgeBaseTool(),
    createEscalateToUserTool(async ({ question, options }) => {
      emit({ type: 'ask_user', conversationId, question, options })
      return askUserRegistry.wait(conversationId)
    })
  ]

  const userMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: userText }],
    timestamp: Date.now()
  }

  const messageId = uuidV4()
  emit({ type: 'message_start', conversationId, messageId, role: 'pm' })

  let finalText = ''
  try {
    const stream = agentLoop(
      [userMessage as AgentMessage],
      {
        systemPrompt:
          PM_SYSTEM_PROMPT + `\n\nEmployees:\n${rosterText(employees)}`,
        messages: history as AgentMessage[],
        tools
      },
      {
        model: chatModel,
        apiKey,
        convertToLlm: (msgs: AgentMessage[]): Message[] =>
          msgs.filter(
            (m): m is Message =>
              (m as Message).role === 'user' ||
              (m as Message).role === 'assistant' ||
              (m as Message).role === 'toolResult'
          )
      },
      signal
    )

    for await (const event of stream) {
      if (event.type === 'message_update') {
        const msg = event.message as Message
        if (msg.role !== 'assistant') continue
        finalText = msg.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('')
        emit({
          type: 'message_delta',
          conversationId,
          messageId,
          delta: finalText
        })
      } else if (event.type === 'message_end') {
        const msg = event.message as Message & { role: 'assistant' }
        if (msg.role === 'assistant' && msg.stopReason === 'error') {
          throw new Error(
            msg.errorMessage ||
              'The PM model returned an error without details.'
          )
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'conversation_error', conversationId, error: message })
    await createConversationMessage({
      conversationId,
      role: 'system',
      content: `⚠️ PM error: ${message}`
    })
    emit({ type: 'message_end', conversationId, messageId })
    return
  }

  await createConversationMessage({
    conversationId,
    role: 'pm',
    content: finalText
  })
  emit({ type: 'message_end', conversationId, messageId })
}
```

> The mandatory review/correction loop (spec §4.2) lives in `PM_SYSTEM_PROMPT`; delegation results flow back into the PM loop because each `delegateTask` returns the employee output, which the agent loop feeds back as a tool result.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/main/lib/ai/agent-x/pm-coordinator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/agent-x/pm-coordinator.ts src/main/lib/ai/agent-x/pm-coordinator.test.ts
git commit -m "feat(agent-x): add PM coordinator loop with delegate/recruit/kb/askUser"
```

### Task 2.12: Conversation routes (CRUD, messages, send, respond, costs, SSE)

**Files:**

- Create: `src/main/lib/server/routes/agent-x-conversations.ts`
- Modify: `src/main/lib/server/routes/agent-x.ts` (mount it)
- Test: `src/main/lib/server/routes/agent-x-conversations.test.ts`

- [ ] **Step 1: Write the failing test** (costs aggregation is the unit worth testing; mock queries)

```typescript
// src/main/lib/server/routes/agent-x-conversations.test.ts
import { describe, expect, it, vi } from 'vitest'
vi.mock('../utils', () => ({
  getRequiredParam: (_c: unknown, _k: string) => 'id',
  handleDatabaseOperation: (fn: () => unknown) => fn(),
  successResponse: (_c: unknown, data: unknown) => data,
  validateSchema: (_s: unknown, d: unknown) => d
}))
vi.mock('../../db/agent-x-queries', () => ({
  getAgentXCostRows: getAgentXCostRows
}))
const getAgentXCostRows = vi.fn()
vi.mock('../../db/conversation-queries', () => ({}))
vi.mock('../../db/knowledge-queries', () => ({}))
vi.mock('../../ai/agent-x/pm-coordinator', () => ({
  runPmCoordinator: vi.fn()
}))
vi.mock('../../ai/agent-x/ask-user-registry', () => ({
  askUserRegistry: { resolve: vi.fn() }
}))
vi.mock('./agent-x-sse', () => ({ emitToConversation: vi.fn() }))

const { aggregateCosts } = await import('./agent-x-conversations')

describe('aggregateCosts', () => {
  it('sums tokens and cost by conversation and agent', () => {
    const rows = [
      {
        conversationId: 'c1',
        agentId: 'a1',
        tokenUsage: { inputTokens: 100, outputTokens: 50, cost: 0.5 },
        startedAt: new Date('2026-05-01')
      },
      {
        conversationId: 'c1',
        agentId: 'a2',
        tokenUsage: { inputTokens: 200, outputTokens: 80, cost: 0.7 },
        startedAt: new Date('2026-05-01')
      }
    ]
    const summary = aggregateCosts(rows as never)
    expect(summary.totalCost).toBeCloseTo(1.2)
    expect(summary.totalTokens).toBe(430)
    expect(
      summary.byConversation.find((c) => c.conversationId === 'c1')!.cost
    ).toBeCloseTo(1.2)
    expect(summary.byAgent).toHaveLength(2)
  })
})
```

> Note: this test imports a pure exported helper `aggregateCosts`; the Hono routes themselves are integration-tested manually in Phase verification.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/server/routes/agent-x-conversations.test.ts`
Expected: FAIL — module not found / `aggregateCosts` not exported.

- [ ] **Step 3: Add the cost rows query to `agent-x-queries.ts`**

Append to `src/main/lib/db/agent-x-queries.ts`:

```typescript
import {
  taskExecution as taskExecutionTable,
  task as taskTable
} from './schema'

/** All agent-x executions joined to their task's conversation, for Costs. */
export async function getAgentXCostRows() {
  return db
    .select({
      conversationId: taskTable.conversationId,
      agentId: taskExecutionTable.agentId,
      tokenUsage: taskExecutionTable.tokenUsage,
      startedAt: taskExecutionTable.startedAt
    })
    .from(taskExecutionTable)
    .innerJoin(taskTable, eq(taskExecutionTable.taskId, taskTable.id))
}
```

(Use the already-imported `eq`, `db`. If `task`/`taskExecution` aren't imported in that file yet, add them to the existing `import { ... } from './schema'`.)

- [ ] **Step 4: Implement the route module**

```typescript
// src/main/lib/server/routes/agent-x-conversations.ts
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'

import { runPmCoordinator } from '../../ai/agent-x/pm-coordinator'
import { askUserRegistry } from '../../ai/agent-x/ask-user-registry'
import { getAgentXCostRows } from '../../db/agent-x-queries'
import {
  addMemberToConversation,
  createConversation,
  createConversationMessage,
  getAllConversations,
  getConversationById,
  getMessagesByConversationId,
  updateConversation
} from '../../db/conversation-queries'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getAllKnowledgeDocs,
  updateKnowledgeDoc
} from '../../db/knowledge-queries'
import { logger } from '../../logger'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'
import { emitToConversation } from './agent-x-sse'

interface CostRow {
  conversationId: string | null
  agentId: string
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    cost?: number
  } | null
  startedAt: Date
}

export interface AgentXCostSummary {
  totalCost: number
  totalTokens: number
  byConversation: Array<{
    conversationId: string
    cost: number
    tokens: number
  }>
  byAgent: Array<{ agentId: string; cost: number; tokens: number }>
  daily: Array<{ date: string; cost: number; tokens: number }>
}

/** Pure aggregation — unit tested. Costs come ONLY from agent-x executions. */
export function aggregateCosts(rows: CostRow[]): AgentXCostSummary {
  let totalCost = 0
  let totalTokens = 0
  const conv = new Map<string, { cost: number; tokens: number }>()
  const agent = new Map<string, { cost: number; tokens: number }>()
  const day = new Map<string, { cost: number; tokens: number }>()

  for (const r of rows) {
    const u = r.tokenUsage
    if (!u) continue
    const tokens = (u.inputTokens ?? 0) + (u.outputTokens ?? 0)
    const cost = u.cost ?? 0
    totalCost += cost
    totalTokens += tokens
    if (r.conversationId) {
      const c = conv.get(r.conversationId) ?? { cost: 0, tokens: 0 }
      c.cost += cost
      c.tokens += tokens
      conv.set(r.conversationId, c)
    }
    const a = agent.get(r.agentId) ?? { cost: 0, tokens: 0 }
    a.cost += cost
    a.tokens += tokens
    agent.set(r.agentId, a)
    const d = r.startedAt.toISOString().slice(0, 10)
    const dd = day.get(d) ?? { cost: 0, tokens: 0 }
    dd.cost += cost
    dd.tokens += tokens
    day.set(d, dd)
  }

  return {
    totalCost,
    totalTokens,
    byConversation: [...conv.entries()].map(([conversationId, v]) => ({
      conversationId,
      ...v
    })),
    byAgent: [...agent.entries()].map(([agentId, v]) => ({ agentId, ...v })),
    daily: [...day.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))
  }
}

const router = new Hono<{ Variables: Variables }>()

// ─── Conversations ──────────────────────────────────────────────────────────

router.get('/conversations', async (c) =>
  successResponse(
    c,
    await handleDatabaseOperation(
      () => getAllConversations(),
      'Failed to list conversations'
    )
  )
)

router.post('/conversations', async (c) => {
  const data = validateSchema(
    z.object({ title: z.string().min(1), icon: z.string().optional() }),
    await c.req.json(),
    'Invalid conversation data'
  )
  const row = await handleDatabaseOperation(
    () => createConversation(data),
    'Failed to create conversation'
  )
  return successResponse(c, row, 201)
})

router.put('/conversations/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    z.object({
      title: z.string().optional(),
      icon: z.string().optional(),
      archived: z.boolean().optional()
    }),
    await c.req.json(),
    'Invalid conversation data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => updateConversation(id, data),
      'Failed to update'
    )
  )
})

router.get('/conversations/:id/messages', async (c) => {
  const id = getRequiredParam(c, 'id')
  return successResponse(c, await getMessagesByConversationId(id))
})

// Send a user message → persist → kick the PM loop (fire-and-forget).
router.post('/conversations/:id/messages', async (c) => {
  const id = getRequiredParam(c, 'id')
  const { content } = validateSchema(
    z.object({ content: z.string().min(1) }),
    await c.req.json(),
    'Invalid message'
  )
  const userMsg = await createConversationMessage({
    conversationId: id,
    role: 'user',
    content
  })
  emitToConversation(id, {
    type: 'message_start',
    conversationId: id,
    messageId: userMsg.id,
    role: 'user'
  })
  emitToConversation(id, {
    type: 'message_end',
    conversationId: id,
    messageId: userMsg.id
  })

  runPmCoordinator({
    conversationId: id,
    userText: content,
    emit: (event) => emitToConversation(id, event)
  }).catch((err) =>
    logger.error('agent_x', 'PM loop error', { error: String(err) })
  )

  return successResponse(c, userMsg, 201)
})

// Resolve a pending askUser.
router.post('/conversations/:id/respond', async (c) => {
  const id = getRequiredParam(c, 'id')
  const { response } = validateSchema(
    z.object({ response: z.string() }),
    await c.req.json(),
    'Invalid response'
  )
  await createConversationMessage({
    conversationId: id,
    role: 'user',
    content: response
  })
  askUserRegistry.resolve(id, response)
  return successResponse(c, { success: true })
})

// ─── Knowledge base ──────────────────────────────────────────────────────────

router.get('/knowledge', async (c) =>
  successResponse(c, await getAllKnowledgeDocs())
)
router.post('/knowledge', async (c) => {
  const data = validateSchema(
    z.object({ title: z.string().min(1), content: z.string().min(1) }),
    await c.req.json(),
    'Invalid knowledge doc'
  )
  return successResponse(c, await createKnowledgeDoc(data), 201)
})
router.put('/knowledge/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    z.object({ title: z.string().optional(), content: z.string().optional() }),
    await c.req.json(),
    'Invalid knowledge doc'
  )
  return successResponse(c, await updateKnowledgeDoc(id, data))
})
router.delete('/knowledge/:id', async (c) => {
  await deleteKnowledgeDoc(getRequiredParam(c, 'id'))
  return c.text('deleted', 200)
})

// ─── Costs (agent-x only) ──────────────────────────────────────────────────────

router.get('/costs', async (c) => {
  const rows = await getAgentXCostRows()
  return successResponse(c, aggregateCosts(rows as never))
})

export default router
```

- [ ] **Step 5: Mount it in `agent-x.ts`**

```typescript
import agentXConversations from './agent-x-conversations'
// ...
agentX.route('/', agentXConversations)
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test src/main/lib/server/routes/agent-x-conversations.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/lib/server/routes/agent-x-conversations.ts src/main/lib/server/routes/agent-x.ts src/main/lib/db/agent-x-queries.ts src/main/lib/server/routes/agent-x-conversations.test.ts
git commit -m "feat(agent-x): conversation/message/knowledge/costs routes + PM trigger"
```

### Task 2.13: Retire dead backend modules & clean `agent-x-crud.ts`

**Files:**

- Delete: `src/main/lib/ai/agent-x/auto-router.ts`, `auto-fill.ts`, `smart-dispatch.ts`
- Modify: `src/main/lib/server/routes/agent-x-crud.ts`
- Modify: `src/main/lib/db/agent-x-queries.ts` (drop department CRUD, `isAgentBusy`, `batchUpdatePositions`, getActiveAgents shadow filter)

- [ ] **Step 1: Delete retired engine files**

Run:

```bash
git rm src/main/lib/ai/agent-x/auto-router.ts src/main/lib/ai/agent-x/auto-fill.ts src/main/lib/ai/agent-x/smart-dispatch.ts
```

- [ ] **Step 2: Trim `agent-x-queries.ts`**

Remove `getAllDepartments`, `getDepartmentById`, `createDepartment`, `updateDepartment`, `deleteDepartment`, `getAgentsByDepartmentId`, `isAgentBusy`, `batchUpdatePositions`. Update `getActiveAgents` to drop the `isShadow` filter:

```typescript
export async function getActiveAgents() {
  return db
    .select()
    .from(agent)
    .where(eq(agent.isActive, true))
    .orderBy(asc(agent.createdAt))
}
```

Remove the now-unused `department` import and `and`/`isNull` imports if they become unused (let typecheck tell you).

- [ ] **Step 3: Rewrite `agent-x-crud.ts`** — keep only employee (agent) CRUD with the new self-owned fields; drop departments, auto-route, auto-fill, positions, and the old task-dispatch task routes.

Replace the file with:

```typescript
// src/main/lib/server/routes/agent-x-crud.ts
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'

import { listInstalledSkills } from '../../ai/skills/skills-manager'
import {
  createAgent,
  deleteAgent,
  getAgentMemories,
  getAllAgents,
  updateAgent
} from '../../db/agent-x-queries'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const agentXCrud = new Hono<{ Variables: Variables }>()

const employeeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  team: z.string().optional().nullable(),
  avatarSeed: z.string().optional().nullable(),
  avatarStyle: z.string().optional().nullable(),
  systemPrompt: z.string().optional(),
  toolAllowList: z.array(z.string()).optional(),
  skillSlugs: z.array(z.string()).optional(),
  mcpServerNames: z.array(z.string()).optional(),
  model: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  isActive: z.boolean().optional()
})

agentXCrud.get('/agents', async (c) =>
  successResponse(
    c,
    await handleDatabaseOperation(
      () => getAllAgents(),
      'Failed to get employees'
    )
  )
)

agentXCrud.post('/agents', async (c) => {
  const data = validateSchema(
    employeeSchema,
    await c.req.json(),
    'Invalid employee data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => createAgent(data),
      'Failed to create employee'
    ),
    201
  )
})

agentXCrud.put('/agents/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    employeeSchema.partial(),
    await c.req.json(),
    'Invalid employee data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => updateAgent(id, data),
      'Failed to update employee'
    )
  )
})

agentXCrud.delete('/agents/:id', async (c) => {
  await handleDatabaseOperation(
    () => deleteAgent(getRequiredParam(c, 'id')),
    'Failed to delete employee'
  )
  return c.text('Employee deleted', 200)
})

agentXCrud.get('/agents/:id/memories', async (c) =>
  successResponse(c, await getAgentMemories(getRequiredParam(c, 'id')))
)

agentXCrud.get('/available-skills', async (c) => {
  const skills = await listInstalledSkills()
  return successResponse(
    c,
    skills.map((s) => ({
      slug: s.slug,
      name: s.displayName,
      isActive: s.isActive
    }))
  )
})

export default agentXCrud
```

- [ ] **Step 4: Typecheck the node side end-to-end**

Run: `pnpm typecheck:node`
Expected: PASS. (If `scheduler.ts` still references `smartDispatch`, that's fixed in Phase 4 — but it will error here. To keep this task green, temporarily stub the scheduler's dispatch in Task 4.1; if blocking, do Task 4.1 immediately after this step before typechecking. **Sequence note:** run Task 4.1 right after this task so node typecheck is clean.)

- [ ] **Step 5: Commit**

```bash
git add -A src/main/lib/ai/agent-x src/main/lib/server/routes/agent-x-crud.ts src/main/lib/db/agent-x-queries.ts
git commit -m "refactor(agent-x): retire department/auto-router/smart-dispatch; employee CRUD only"
```

---

# Phase 4 — Scheduler into chat (do immediately after Task 2.13 to keep node typecheck green)

### Task 4.1: Scheduler fires into a conversation + PM loop

**Files:**

- Modify: `src/main/lib/ai/agent-x/scheduler.ts`
- Modify: `src/main/lib/db/agent-x-queries.ts` (`getCronTasks` already exists; ensure cron tasks carry `conversationId`)
- Test: `src/main/lib/ai/agent-x/scheduler.test.ts`

A scheduled task is a `task` row with a `cronExpression` and a `conversationId`. On fire: inject a `role:'system'` round-start message and run the PM loop with the task title as the prompt.

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/lib/ai/agent-x/scheduler.test.ts
import { describe, expect, it, vi } from 'vitest'

const runPmCoordinator = vi.fn(async () => {})
const createConversationMessage = vi.fn(async () => ({ id: 'm' }))
vi.mock('./pm-coordinator', () => ({ runPmCoordinator }))
vi.mock('../../db/conversation-queries', () => ({ createConversationMessage }))
vi.mock('../../db/agent-x-queries', () => ({
  getCronTasks: async () => [],
  getTaskById: async () => ({
    id: 't',
    title: 'Daily report',
    conversationId: 'c1',
    status: 'pending'
  }),
  updateTask: vi.fn()
}))
vi.mock('node-cron', () => ({
  default: {
    validate: () => true,
    schedule: (_e: string, fn: () => void) => ({ stop: () => {}, _fn: fn })
  }
}))

const { runScheduledRound } = await import('./scheduler')

describe('runScheduledRound', () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/scheduler.test.ts`
Expected: FAIL — `runScheduledRound` not exported.

- [ ] **Step 3: Rewrite `scheduler.ts`**

```typescript
// src/main/lib/ai/agent-x/scheduler.ts
import cron, { type ScheduledTask } from 'node-cron'

import { getCronTasks, getTaskById, updateTask } from '../../db/agent-x-queries'
import { createConversationMessage } from '../../db/conversation-queries'
import { logger } from '../../logger'
import type { SseEmitter } from './employee-loop'
import { runPmCoordinator } from './pm-coordinator'

const scheduledJobs = new Map<string, ScheduledTask>()
let globalEmit: SseEmitter = () => {}

export function setSchedulerEmitter(emit: SseEmitter) {
  globalEmit = emit
}

/** One scheduled firing: inject a system round-start message, run the PM loop. */
export async function runScheduledRound(
  taskId: string,
  emit: SseEmitter
): Promise<void> {
  const template = await getTaskById(taskId)
  if (
    !template ||
    template.status === 'cancelled' ||
    !template.conversationId
  ) {
    unscheduleTask(taskId)
    return
  }
  const label = `[定时] ${template.title}`
  await createConversationMessage({
    conversationId: template.conversationId,
    role: 'system',
    content: label
  })
  emit({ type: 'round_start', conversationId: template.conversationId, label })
  await updateTask(taskId, { lastRunAt: new Date() })

  await runPmCoordinator({
    conversationId: template.conversationId,
    userText: `${template.title}\n\n${template.description ?? ''}`.trim(),
    emit
  })
  await updateTask(taskId, { lastRunStatus: 'completed' })
}

export function scheduleTask(taskId: string, cronExpression: string): boolean {
  if (!cron.validate(cronExpression)) {
    logger.error('scheduler', 'Invalid cron expression', {
      taskId,
      cronExpression
    })
    return false
  }
  unscheduleTask(taskId)
  const job = cron.schedule(cronExpression, () => {
    runScheduledRound(taskId, globalEmit).catch((err) =>
      logger.error('scheduler', 'Scheduled round error', {
        taskId,
        error: String(err)
      })
    )
  })
  scheduledJobs.set(taskId, job)
  logger.info('scheduler', 'Scheduled task', { taskId, cronExpression })
  return true
}

export function unscheduleTask(taskId: string) {
  const job = scheduledJobs.get(taskId)
  if (job) {
    job.stop()
    scheduledJobs.delete(taskId)
    logger.info('scheduler', 'Unscheduled task', { taskId })
  }
}

export function getScheduledTaskIds(): string[] {
  return Array.from(scheduledJobs.keys())
}

export async function initScheduler(emit: SseEmitter): Promise<void> {
  setSchedulerEmitter(emit)
  const tasks = await getCronTasks()
  let count = 0
  for (const t of tasks) {
    if (t.cronExpression && scheduleTask(t.id, t.cronExpression)) count++
  }
  logger.info('scheduler', 'Initialized', { activeTasks: count })
}
```

- [ ] **Step 4: Update `app.ts` import of `emitToAll`** — already passes `emitToAll` to `initScheduler`; `emitToAll` accepts `AgentXSseEvent`, and `round_start` is now part of that union, so no change needed. Verify:

Run: `pnpm typecheck:node`
Expected: PASS (whole node side now compiles).

- [ ] **Step 5: Run scheduler test**

Run: `pnpm test src/main/lib/ai/agent-x/scheduler.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/lib/ai/agent-x/scheduler.ts src/main/lib/ai/agent-x/scheduler.test.ts
git commit -m "feat(agent-x): scheduled tasks fire a new chat round via the PM loop"
```

### Task 4.2: Full backend test + typecheck gate

- [ ] **Step 1: Run the whole backend test suite + node typecheck**

Run: `pnpm test && pnpm typecheck:node`
Expected: all PASS. If any retired-module import remains, fix it now.

- [ ] **Step 2: Commit any fixups**

```bash
git add -A && git commit -m "chore(agent-x): backend green after chat redesign" || echo "nothing to commit"
```

---

# Phase 3 — Frontend (three-column chat + Employees + Knowledge Base)

> No renderer test harness exists. Each task verifies with `pnpm typecheck:web` and a manual `pnpm dev` check. Reuse `messages-calling-tools.tsx` for tool cards and the `use-lcm-status.ts` EventSource pattern.

### Task 3.1: Update stores + types for the new model

**Files:**

- Modify: `src/renderer/stores/agent-x.ts`
- Create: `src/renderer/stores/agent-x-chat.ts`

- [ ] **Step 1: Rewrite `stores/agent-x.ts`** — drop department/graph atoms and old fields; redefine `AgentData` (employee) and `TaskData`:

```typescript
// src/renderer/stores/agent-x.ts
import type { ConversationMessageRole } from '@shared/types/agent-x'

export interface AgentData {
  id: string
  name: string
  description: string | null
  team: string | null
  avatarSeed: string | null
  avatarStyle: string | null
  systemPrompt: string | null
  toolAllowList: string[] | null
  skillSlugs: string[] | null
  mcpServerNames: string[] | null
  model: string | null
  provider: string | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
}

export interface ConversationData {
  id: string
  title: string
  icon: string | null
  memberAgentIds: string[] | null
  archived: boolean | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
}

export interface ConversationMessageData {
  id: string
  conversationId: string
  role: ConversationMessageRole
  agentId: string | null
  content: string
  parts: Record<string, unknown>[] | null
  taskId: string | null
  createdAt: string
}

export interface KnowledgeDocData {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Create `stores/agent-x-chat.ts`** for live UI state:

```typescript
// src/renderer/stores/agent-x-chat.ts
import { atom } from 'jotai'

export const activeConversationIdAtom = atom<string | null>(null)
// In-flight streaming bubbles keyed by messageId (server messageId).
export const streamingBubblesAtom = atom<
  Record<
    string,
    { role: string; agentId?: string; text: string; done: boolean }
  >
>({})
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck:web 2>&1 | grep stores/agent-x`
Expected: no errors from the store files (container errors are expected until Task 3.6).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/stores/agent-x.ts src/renderer/stores/agent-x-chat.ts
git commit -m "feat(agent-x): renderer stores for employees, conversations, chat"
```

### Task 3.2: Chat + employee + KB services

**Files:**

- Create: `src/renderer/services/agent-x-chat.ts`
- Modify: `src/renderer/services/agent-x.ts`

- [ ] **Step 1: Create `services/agent-x-chat.ts`**

```typescript
// src/renderer/services/agent-x-chat.ts
import { fetcher } from '@shared/utils/http'

import type {
  ConversationData,
  ConversationMessageData,
  KnowledgeDocData
} from '@/stores/agent-x'

const BASE = '/api/agent-x'

export const getConversations = () =>
  fetcher<ConversationData[]>(`${BASE}/conversations`)
export const createConversation = (data: { title: string; icon?: string }) =>
  fetcher<ConversationData>(`${BASE}/conversations`, {
    method: 'POST',
    body: data as never
  })
export const updateConversation = (
  id: string,
  data: Partial<ConversationData>
) =>
  fetcher<ConversationData>(`${BASE}/conversations/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const getConversationMessages = (id: string) =>
  fetcher<ConversationMessageData[]>(`${BASE}/conversations/${id}/messages`)
export const sendConversationMessage = (id: string, content: string) =>
  fetcher<ConversationMessageData>(`${BASE}/conversations/${id}/messages`, {
    method: 'POST',
    body: { content } as never
  })
export const respondToConversation = (id: string, response: string) =>
  fetcher<{ success: boolean }>(`${BASE}/conversations/${id}/respond`, {
    method: 'POST',
    body: { response } as never
  })

export const getKnowledgeDocs = () =>
  fetcher<KnowledgeDocData[]>(`${BASE}/knowledge`)
export const createKnowledgeDoc = (data: { title: string; content: string }) =>
  fetcher<KnowledgeDocData>(`${BASE}/knowledge`, {
    method: 'POST',
    body: data as never
  })
export const updateKnowledgeDoc = (
  id: string,
  data: { title?: string; content?: string }
) =>
  fetcher<KnowledgeDocData>(`${BASE}/knowledge/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteKnowledgeDoc = (id: string) =>
  fetcher<void>(`${BASE}/knowledge/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

export interface AgentXCostSummary {
  totalCost: number
  totalTokens: number
  byConversation: Array<{
    conversationId: string
    cost: number
    tokens: number
  }>
  byAgent: Array<{ agentId: string; cost: number; tokens: number }>
  daily: Array<{ date: string; cost: number; tokens: number }>
}
export const getAgentXCosts = () => fetcher<AgentXCostSummary>(`${BASE}/costs`)
```

- [ ] **Step 2: Trim `services/agent-x.ts`** — keep only employee endpoints + memories + available skills; delete department, task, auto-route/fill, positions, escalation wrappers:

```typescript
// src/renderer/services/agent-x.ts
import { fetcher } from '@shared/utils/http'

import type { AgentData } from '@/stores/agent-x'

const BASE = '/api/agent-x'

export const getAgents = () => fetcher<AgentData[]>(`${BASE}/agents`)
export const createAgentApi = (
  data: Partial<Omit<AgentData, 'id' | 'createdAt' | 'updatedAt'>>
) =>
  fetcher<AgentData>(`${BASE}/agents`, { method: 'POST', body: data as never })
export const updateAgentApi = (id: string, data: Partial<AgentData>) =>
  fetcher<AgentData>(`${BASE}/agents/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteAgentApi = (id: string) =>
  fetcher<void>(`${BASE}/agents/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })
export const getAgentMemories = (id: string) =>
  fetcher<
    Array<{ id: string; key: string; value: unknown; createdAt: string }>
  >(`${BASE}/agents/${id}/memories`)
export const getAvailableSkills = () =>
  fetcher<Array<{ slug: string; name: string; isActive: boolean }>>(
    `${BASE}/available-skills`
  )
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck:web 2>&1 | grep services/agent-x`
Expected: no errors from the service files themselves.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/services/agent-x.ts src/renderer/services/agent-x-chat.ts
git commit -m "feat(agent-x): renderer services for chat, employees, knowledge, costs"
```

### Task 3.3: Conversation SSE hook

**Files:**

- Create: `src/renderer/hooks/use-conversation-stream.ts`

- [ ] **Step 1: Implement** (mirror `use-lcm-status.ts`; assemble streaming bubbles)

```typescript
// src/renderer/hooks/use-conversation-stream.ts
import { BASE_URL } from '@shared/constants/systems'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import { useEffect, useState } from 'react'

export interface LiveBubble {
  messageId: string
  role: string
  agentId?: string
  text: string
  done: boolean
  toolCards: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
}

export interface ConversationStream {
  bubbles: LiveBubble[]
  askUser: { question: string; options: string[] } | null
  error: string | null
  /** bumps whenever a message_end / member_joined arrives so the page can refetch */
  revision: number
}

export function useConversationStream(
  conversationId: string | null
): ConversationStream {
  const [bubbles, setBubbles] = useState<LiveBubble[]>([])
  const [askUser, setAskUser] = useState<ConversationStream['askUser']>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!conversationId) return
    setBubbles([])
    setAskUser(null)
    setError(null)

    const source = new EventSource(
      `${BASE_URL}/api/agent-x/conversations/${conversationId}/sse`
    )
    source.onmessage = (e) => {
      let evt: AgentXSseEvent
      try {
        evt = JSON.parse(e.data) as AgentXSseEvent
      } catch {
        return
      }
      if (!('conversationId' in evt) || evt.conversationId !== conversationId)
        return

      switch (evt.type) {
        case 'message_start':
          setBubbles((prev) => [
            ...prev,
            {
              messageId: evt.messageId,
              role: evt.role,
              agentId: evt.agentId,
              text: '',
              done: false,
              toolCards: []
            }
          ])
          break
        case 'message_delta':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, text: evt.delta } : b
            )
          )
          break
        case 'message_end':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, done: true } : b
            )
          )
          setRevision((r) => r + 1)
          break
        case 'tool_card':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId
                ? {
                    ...b,
                    toolCards: [
                      ...b.toolCards,
                      {
                        toolName: evt.toolName,
                        phase: evt.phase,
                        result: evt.result
                      }
                    ]
                  }
                : b
            )
          )
          break
        case 'member_joined':
          setRevision((r) => r + 1)
          break
        case 'ask_user':
          setAskUser({ question: evt.question, options: evt.options })
          break
        case 'conversation_error':
          setError(evt.error)
          break
      }
    }
    return () => source.close()
  }, [conversationId])

  return { bubbles, askUser, error, revision }
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck:web 2>&1 | grep use-conversation-stream`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/use-conversation-stream.ts
git commit -m "feat(agent-x): conversation SSE hook assembling live bubbles"
```

### Task 3.4: Avatar components (DiceBear)

**Files:**

- Create: `src/renderer/components/agent-x/employees/employee-avatar.tsx`
- Create: `src/renderer/components/agent-x/employees/avatar-picker.tsx`

- [ ] **Step 1: Implement `employee-avatar.tsx`** (deterministic render from seed+style)

```tsx
// src/renderer/components/agent-x/employees/employee-avatar.tsx
import { createAvatar } from '@dicebear/core'
import * as collection from '@dicebear/collection'
import { DEFAULT_AVATAR_STYLE } from '@shared/constants/avatar'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

export function EmployeeAvatar({
  seed,
  style,
  size = 36,
  className
}: {
  seed: string | null
  style: string | null
  size?: number
  className?: string
}) {
  const uri = useMemo(() => {
    const styleKey = (style ?? DEFAULT_AVATAR_STYLE) as keyof typeof collection
    const factory =
      collection[styleKey] ??
      collection[DEFAULT_AVATAR_STYLE as keyof typeof collection]
    return createAvatar(factory as never, {
      seed: seed ?? 'default'
    }).toDataUri()
  }, [seed, style])

  return (
    <img
      src={uri}
      width={size}
      height={size}
      className={cn('bg-muted rounded-full', className)}
      alt="avatar"
    />
  )
}
```

- [ ] **Step 2: Implement `avatar-picker.tsx`** (style buttons + reroll seed)

```tsx
// src/renderer/components/agent-x/employees/avatar-picker.tsx
import { AVATAR_STYLES, randomAvatarSeed } from '@shared/constants/avatar'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { EmployeeAvatar } from './employee-avatar'

export function AvatarPicker({
  seed,
  style,
  onChange
}: {
  seed: string | null
  style: string | null
  onChange: (next: { avatarSeed: string; avatarStyle: string }) => void
}) {
  const currentSeed = seed ?? randomAvatarSeed()
  return (
    <div className="flex items-center gap-3">
      <EmployeeAvatar seed={currentSeed} style={style} size={48} />
      <div className="flex flex-wrap gap-1">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              onChange({ avatarSeed: currentSeed, avatarStyle: s })
            }
            className={cn(
              'rounded-md border p-0.5',
              s === (style ?? '') && 'ring-primary ring-2'
            )}
          >
            <EmployeeAvatar seed={currentSeed} style={s} size={32} />
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            avatarSeed: randomAvatarSeed(),
            avatarStyle: style ?? AVATAR_STYLES[0]
          })
        }
      >
        Reroll
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Verify the DiceBear collection keys exist**

Run: `pnpm typecheck:web 2>&1 | grep -E "employee-avatar|avatar-picker"`
Expected: no errors. If `collection[styleKey]` typing complains, the `as never` cast on the factory handles it; confirm `notionists`, `thumbs`, `adventurer` are real exports of `@dicebear/collection` (they are in v9).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/agent-x/employees/employee-avatar.tsx src/renderer/components/agent-x/employees/avatar-picker.tsx
git commit -m "feat(agent-x): deterministic employee avatars via dicebear"
```

### Task 3.5: Chat components (list, bubble, members, composer, group-chat)

**Files:**

- Create: `conversation-list.tsx`, `group-message-bubble.tsx`, `group-members-panel.tsx`, `composer.tsx`, `group-chat.tsx` under `src/renderer/components/agent-x/chat/`

- [ ] **Step 1: `group-message-bubble.tsx`** — avatar + name + team tag + markdown content + tool cards; visual variant by role.

```tsx
// src/renderer/components/agent-x/chat/group-message-bubble.tsx
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'
import type { AgentData } from '@/stores/agent-x'

import { EmployeeAvatar } from '../employees/employee-avatar'

export interface BubbleModel {
  messageId: string
  role: string // 'user' | 'pm' | 'employee' | 'system'
  agentId?: string | null
  text: string
  toolCards?: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
}

export function GroupMessageBubble({
  bubble,
  agentsById
}: {
  bubble: BubbleModel
  agentsById: Record<string, AgentData>
}) {
  const isUser = bubble.role === 'user'
  const isSystem = bubble.role === 'system'
  const agent = bubble.agentId ? agentsById[bubble.agentId] : undefined
  const name = isUser
    ? 'You'
    : bubble.role === 'pm'
      ? 'PM'
      : (agent?.name ?? 'Employee')

  if (isSystem) {
    return (
      <div className="text-muted-foreground my-2 text-center text-xs">
        {bubble.text}
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 py-2', isUser && 'flex-row-reverse')}>
      {bubble.role === 'pm' ? (
        <div className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          PM
        </div>
      ) : isUser ? (
        <div className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs">
          You
        </div>
      ) : (
        <EmployeeAvatar
          seed={agent?.avatarSeed ?? null}
          style={agent?.avatarStyle ?? null}
        />
      )}
      <div
        className={cn('min-w-0 max-w-[80%]', isUser && 'items-end text-right')}
      >
        <div className="text-muted-foreground mb-0.5 flex items-center gap-1.5 text-xs">
          <span className="font-medium">{name}</span>
          {agent?.team && (
            <span className="bg-muted rounded px-1 py-px">{agent.team}</span>
          )}
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
          <Markdown>{bubble.text}</Markdown>
          {bubble.toolCards?.map((card, i) => (
            <div key={i} className="text-muted-foreground mt-1 text-xs">
              🔧 {card.toolName} {card.phase === 'end' ? '✓' : '…'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

> If `@/components/markdown` exports differently, adjust the import to match the chat message markdown renderer used in `messages-calling-tools.tsx`. Tool cards can later upgrade to the rich `messages-calling-tools` renderer; the minimal inline card keeps this task self-contained.

- [ ] **Step 2: `composer.tsx`** — textarea + send; optional `@mention` is future, keep a plain composer for v1.

```tsx
// src/renderer/components/agent-x/chat/composer.tsx
import { SendIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function Composer({
  onSend,
  disabled
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  return (
    <div className="flex items-end gap-2 border-t p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="给团队发个需求…"
        className="max-h-40 min-h-[44px] resize-none"
      />
      <Button onClick={submit} disabled={disabled} size="icon">
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: `group-members-panel.tsx`** — current members + live status placeholder.

```tsx
// src/renderer/components/agent-x/chat/group-members-panel.tsx
import type { AgentData } from '@/stores/agent-x'

import { EmployeeAvatar } from '../employees/employee-avatar'

export function GroupMembersPanel({
  members,
  busyAgentIds
}: {
  members: AgentData[]
  busyAgentIds: Set<string>
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3 text-sm font-medium">
        群成员 ({members.length})
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-md p-2">
            <EmployeeAvatar
              seed={m.avatarSeed}
              style={m.avatarStyle}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{m.name}</div>
              {m.team && (
                <div className="text-muted-foreground truncate text-xs">
                  {m.team}
                </div>
              )}
            </div>
            <span
              className={
                busyAgentIds.has(m.id) ? 'text-amber-500' : 'text-emerald-500'
              }
            >
              ●
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-muted-foreground p-4 text-center text-xs">
            PM 会按需拉人入群
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `conversation-list.tsx`** — left column list + new-group button.

```tsx
// src/renderer/components/agent-x/chat/conversation-list.tsx
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConversationData } from '@/stores/agent-x'

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate
}: {
  conversations: ConversationData[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-medium">工作群</span>
        <Button size="icon-sm" variant="ghost" onClick={onCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
              c.id === activeId && 'bg-muted'
            )}
          >
            <span>{c.icon ?? '💬'}</span>
            <span className="truncate">{c.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: `group-chat.tsx`** — middle column: load history, merge with live bubbles, render, composer, ask-user prompt.

```tsx
// src/renderer/components/agent-x/chat/group-chat.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import {
  getConversationMessages,
  respondToConversation,
  sendConversationMessage
} from '@/services/agent-x-chat'
import type { AgentData, ConversationMessageData } from '@/stores/agent-x'

import { Composer } from './composer'
import { GroupMessageBubble, type BubbleModel } from './group-message-bubble'

export function GroupChat({
  conversationId,
  agentsById
}: {
  conversationId: string
  agentsById: Record<string, AgentData>
}) {
  const [history, setHistory] = useState<ConversationMessageData[]>([])
  const { bubbles, askUser, error, revision } =
    useConversationStream(conversationId)
  const [answer, setAnswer] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    getConversationMessages(conversationId).then(setHistory)
  }, [conversationId])

  useEffect(() => load(), [load])
  useEffect(() => load(), [revision, load]) // refetch on each message_end

  // Persisted history is source of truth; live bubbles only for not-yet-saved.
  const persistedIds = useMemo(
    () => new Set(history.map((h) => h.id)),
    [history]
  )
  const merged: BubbleModel[] = useMemo(() => {
    const fromHistory: BubbleModel[] = history.map((h) => ({
      messageId: h.id,
      role: h.role,
      agentId: h.agentId,
      text: h.content
    }))
    const live = bubbles
      .filter((b) => !persistedIds.has(b.messageId))
      .map((b) => ({
        messageId: b.messageId,
        role: b.role,
        agentId: b.agentId,
        text: b.text,
        toolCards: b.toolCards
      }))
    return [...fromHistory, ...live]
  }, [history, bubbles, persistedIds])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [merged.length, bubbles])

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        {merged.map((b) => (
          <GroupMessageBubble
            key={b.messageId}
            bubble={b}
            agentsById={agentsById}
          />
        ))}
        {error && (
          <div className="text-destructive py-2 text-center text-xs">
            {error}
          </div>
        )}
        {askUser && (
          <div className="bg-muted my-2 rounded-lg p-3">
            <div className="mb-2 text-sm">{askUser.question}</div>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="回复 PM…"
              />
              <Button
                onClick={async () => {
                  await respondToConversation(conversationId, answer)
                  setAnswer('')
                }}
              >
                发送
              </Button>
            </div>
          </div>
        )}
      </div>
      <Composer
        onSend={(text) => sendConversationMessage(conversationId, text)}
      />
    </div>
  )
}
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck:web 2>&1 | grep "agent-x/chat"`
Expected: no errors. Fix import paths for `Markdown`/`Textarea`/`Input` to match the project's component exports if typecheck complains (search `src/renderer/components/ui` for the exact names).

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/agent-x/chat
git commit -m "feat(agent-x): group chat components (list, bubble, members, composer)"
```

### Task 3.6: Employees page + editor

**Files:**

- Create: `src/renderer/components/agent-x/employees/employees-page.tsx`, `employee-editor.tsx`

- [ ] **Step 1: `employee-editor.tsx`** — name, AvatarPicker, team, systemPrompt, skills multiselect, MCP multiselect, toolAllowList, model/provider, read-only memories.

```tsx
// src/renderer/components/agent-x/employees/employee-editor.tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAgentMemories, getAvailableSkills } from '@/services/agent-x'
import type { AgentData } from '@/stores/agent-x'

import { AvatarPicker } from './avatar-picker'

export function EmployeeEditor({
  employee,
  onSave,
  onClose
}: {
  employee: AgentData
  onSave: (data: Partial<AgentData>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AgentData>(employee)
  const [skills, setSkills] = useState<Array<{ slug: string; name: string }>>(
    []
  )
  const [memories, setMemories] = useState<
    Array<{ id: string; key: string; value: unknown }>
  >([])

  useEffect(() => setDraft(employee), [employee])
  useEffect(() => {
    getAvailableSkills().then(setSkills)
    getAgentMemories(employee.id).then((m) => setMemories(m as never))
  }, [employee.id])

  const toggle = (list: string[] | null, slug: string) => {
    const set = new Set(list ?? [])
    set.has(slug) ? set.delete(slug) : set.add(slug)
    return [...set]
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <AvatarPicker
        seed={draft.avatarSeed}
        style={draft.avatarStyle}
        onChange={(a) => setDraft({ ...draft, ...a })}
      />
      <div className="grid gap-1">
        <Label>名字</Label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>Team</Label>
        <Input
          value={draft.team ?? ''}
          onChange={(e) => setDraft({ ...draft, team: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>System Prompt</Label>
        <Textarea
          value={draft.systemPrompt ?? ''}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
          className="min-h-24"
        />
      </div>
      <div className="grid gap-1">
        <Label>Skills</Label>
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  skillSlugs: toggle(draft.skillSlugs, s.slug)
                })
              }
              className={`rounded border px-2 py-0.5 text-xs ${draft.skillSlugs?.includes(s.slug) ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1">
        <Label>记忆（只读）</Label>
        <div className="text-muted-foreground space-y-1 text-xs">
          {memories.length === 0 && <span>暂无累积记忆</span>}
          {memories.map((m) => (
            <div key={m.id} className="bg-muted/50 rounded p-1">
              <b>{m.key}</b>: {JSON.stringify(m.value)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={() => onSave(draft)}>保存</Button>
      </div>
    </div>
  )
}
```

> MCP multiselect + model/provider selectors: wire them the same way `skills` are wired, reusing the project's existing MCP service (`mcp-service.ts`) and provider model lists. If those selectors balloon the task, ship name/team/prompt/skills/memories first and add MCP/model in a follow-up step within this task.

- [ ] **Step 2: `employees-page.tsx`** — grid of employees + create + open editor (Sheet/Dialog).

```tsx
// src/renderer/components/agent-x/employees/employees-page.tsx
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  randomAvatarSeed,
  DEFAULT_AVATAR_STYLE
} from '@shared/constants/avatar'
import {
  createAgentApi,
  deleteAgentApi,
  getAgents,
  updateAgentApi
} from '@/services/agent-x'
import type { AgentData } from '@/stores/agent-x'

import { EmployeeAvatar } from './employee-avatar'
import { EmployeeEditor } from './employee-editor'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [editing, setEditing] = useState<AgentData | null>(null)

  const load = () => getAgents().then(setEmployees)
  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    const emp = await createAgentApi({
      name: 'New Employee',
      avatarSeed: randomAvatarSeed(),
      avatarStyle: DEFAULT_AVATAR_STYLE
    })
    setEmployees((p) => [...p, emp])
    setEditing(emp)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">员工</h2>
        <Button onClick={create}>
          <Plus className="mr-1 h-4 w-4" />
          新建
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {employees.map((e) => (
          <button
            key={e.id}
            onClick={() => setEditing(e)}
            className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-left"
          >
            <EmployeeAvatar
              seed={e.avatarSeed}
              style={e.avatarStyle}
              size={40}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{e.name}</div>
              {e.team && (
                <div className="text-muted-foreground truncate text-xs">
                  {e.team}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <SheetContent className="w-[480px] sm:max-w-none">
          {editing && (
            <EmployeeEditor
              employee={editing}
              onClose={() => setEditing(null)}
              onSave={async (data) => {
                const updated = await updateAgentApi(editing.id, data)
                setEmployees((p) =>
                  p.map((x) => (x.id === updated.id ? updated : x))
                )
                setEditing(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck:web 2>&1 | grep employees`
Expected: no errors (fix `Sheet`/`Label` import paths against `src/renderer/components/ui` if needed).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/agent-x/employees
git commit -m "feat(agent-x): employees page and editor"
```

### Task 3.7: Knowledge base page

**Files:**

- Create: `src/renderer/components/agent-x/knowledge/knowledge-base-page.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/renderer/components/agent-x/knowledge/knowledge-base-page.tsx
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getKnowledgeDocs
} from '@/services/agent-x-chat'
import type { KnowledgeDocData } from '@/stores/agent-x'

export function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDocData[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = () => getKnowledgeDocs().then(setDocs)
  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!title.trim() || !content.trim()) return
    const doc = await createKnowledgeDoc({ title, content })
    setDocs((p) => [doc, ...p])
    setTitle('')
    setContent('')
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 p-4">
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{d.title}</h3>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={async () => {
                  await deleteKnowledgeDoc(d.id)
                  setDocs((p) => p.filter((x) => x.id !== d.id))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
              {d.content}
            </p>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="text-muted-foreground text-sm">还没有文档</div>
        )}
      </div>
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="正文"
          className="min-h-40"
        />
        <Button onClick={add} className="w-full">
          <Plus className="mr-1 h-4 w-4" />
          添加文档
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck:web 2>&1 | grep knowledge`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/agent-x/knowledge
git commit -m "feat(agent-x): knowledge base page (stub CRUD)"
```

### Task 3.8: Rewire layout, container, sidebar nav

**Files:**

- Modify: `src/renderer/layouts/agent-x-layout/index.tsx`
- Modify: `src/renderer/containers/agent-x.tsx`
- Modify: `src/renderer/components/agent-x/dashboard/app-sidebar.tsx` + `nav-main.tsx`

- [ ] **Step 1: Update `AgentXPage` + titles in the layout**

In `agent-x-layout/index.tsx`, change the page union and titles; make `chat` the default. Drop the special `org-editor` standalone branch.

```typescript
export type AgentXPage =
  | 'chat'
  | 'employees'
  | 'knowledge'
  | 'dashboard'
  | 'costs'

const pageTitles: Record<AgentXPage, string> = {
  chat: '工作群',
  employees: '员工',
  knowledge: '知识库',
  dashboard: 'Dashboard',
  costs: 'Cost Analysis'
}
```

Set initial state `useState<AgentXPage>('chat')` and delete the `if (activePage === 'org-editor')` block. The Chat page renders full-height three columns, so for `chat` render the container without the scroll wrapper:

```tsx
return (
  <SidebarProvider>
    <AppSidebar
      activePage={activePage}
      onNavigate={(p) => setActivePage(p as AgentXPage)}
    />
    <SidebarInset>
      <SiteHeader title={pageTitles[activePage]} />
      <div
        className={cn(
          'no-drag flex min-h-0 flex-1',
          activePage === 'chat' ? 'overflow-hidden' : 'flex-col overflow-y-auto'
        )}
      >
        <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
      </div>
    </SidebarInset>
  </SidebarProvider>
)
```

- [ ] **Step 2: Rewrite `containers/agent-x.tsx`** — remove all department/graph/task-dispatch logic; render the new pages. Core:

```tsx
// src/renderer/containers/agent-x.tsx
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import { ConversationList } from '@/components/agent-x/chat/conversation-list'
import { GroupChat } from '@/components/agent-x/chat/group-chat'
import { GroupMembersPanel } from '@/components/agent-x/chat/group-members-panel'
import { EmployeesPage } from '@/components/agent-x/employees/employees-page'
import { KnowledgeBasePage } from '@/components/agent-x/knowledge/knowledge-base-page'
import type { AgentXPage } from '@/layouts/agent-x-layout'
import { getAgents } from '@/services/agent-x'
import { createConversation, getConversations } from '@/services/agent-x-chat'
import type { AgentData, ConversationData } from '@/stores/agent-x'

const CostAnalysis = lazy(() =>
  import('@/components/agent-x/cost-analysis').then((m) => ({
    default: m.CostAnalysis
  }))
)

export function AgentXContainer({
  activePage
}: {
  activePage: AgentXPage
  onNavigate?: (p: AgentXPage) => void
}) {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    getConversations().then((cs) => {
      setConversations(cs)
      setActiveId((cur) => cur ?? cs[0]?.id ?? null)
    })
    getAgents().then(setEmployees)
  }, [])

  const agentsById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  )

  const handleCreate = useCallback(async () => {
    const conv = await createConversation({ title: '新工作群' })
    setConversations((p) => [conv, ...p])
    setActiveId(conv.id)
  }, [])

  const activeConv = conversations.find((c) => c.id === activeId)
  const members = (activeConv?.memberAgentIds ?? [])
    .map((id) => agentsById[id])
    .filter(Boolean) as AgentData[]

  if (activePage === 'chat') {
    return (
      <div className="grid h-full w-full grid-cols-[260px_1fr_260px]">
        <div className="border-r">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreate}
          />
        </div>
        <div className="min-w-0">
          {activeId ? (
            <GroupChat conversationId={activeId} agentsById={agentsById} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              新建一个工作群开始
            </div>
          )}
        </div>
        <div className="border-l">
          <GroupMembersPanel members={members} busyAgentIds={new Set()} />
        </div>
      </div>
    )
  }

  if (activePage === 'employees') return <EmployeesPage />
  if (activePage === 'knowledge') return <KnowledgeBasePage />
  if (activePage === 'costs')
    return (
      <Suspense fallback={null}>
        <CostAnalysis />
      </Suspense>
    )
  // dashboard: keep the existing SectionCards/Chart if desired, or a simple placeholder.
  return <div className="text-muted-foreground p-6 text-sm">Dashboard</div>
}
```

> The Dashboard page can keep `SectionCards`/`ChartAreaInteractive` if you want metrics; fetch counts from conversations/employees. Keeping it as a placeholder is acceptable for v1 since spec §5 makes Dashboard secondary.

- [ ] **Step 3: Update the sidebar nav** (`app-sidebar.tsx` / `nav-main.tsx`) to list: 工作群 (chat), 员工 (employees), 知识库 (knowledge), Dashboard, Costs — pointing `onNavigate` at the new page keys. Match the existing nav item shape in those files.

- [ ] **Step 4: Delete retired frontend files**

```bash
git rm src/renderer/components/agent-x/org-editor-graph.tsx \
  src/renderer/components/agent-x/org-graph.tsx \
  src/renderer/components/agent-x/department-config-panel.tsx \
  src/renderer/components/agent-x/task-dispatch-dialog.tsx \
  src/renderer/components/agent-x/task-kanban.tsx \
  src/renderer/components/agent-x/task-list.tsx \
  src/renderer/components/agent-x/execution-timeline.tsx \
  src/renderer/components/agent-x/agent-config-panel.tsx
git rm -r src/renderer/components/agent-x/ui
```

(Keep `task-log-sheet.tsx` only if still referenced; otherwise remove it too. Verify with grep before deleting.)

- [ ] **Step 5: Typecheck the whole web side**

Run: `pnpm typecheck:web`
Expected: PASS. Fix any dangling imports of deleted components.

- [ ] **Step 6: Commit**

```bash
git add -A src/renderer
git commit -m "feat(agent-x): three-column chat layout, employees/knowledge pages, retire org UI"
```

---

# Phase 5 — Costs fix (frontend)

### Task 5.1: Point Cost Analysis at the agent-x costs endpoint

**Files:**

- Modify: `src/renderer/components/agent-x/cost-analysis.tsx`

- [ ] **Step 1: Swap the data source**

Replace `import { getUsageSummary } from '@/services/usage'` and its usage with `getAgentXCosts` from `@/services/agent-x-chat`. Map the new `AgentXCostSummary` shape (`totalCost`, `totalTokens`, `daily`, `byAgent`, `byConversation`) to the existing chart props. Where the old code showed per-model rows, show per-employee (`byAgent`) and per-conversation rows instead.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck:web 2>&1 | grep cost-analysis`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/agent-x/cost-analysis.tsx
git commit -m "fix(agent-x): Costs aggregates agent-x executions only, not global chat usage"
```

---

# Phase 6 — Agent memory write + avatar finalization + polish

### Task 6.1: Persist employee memory after a delegated task

**Files:**

- Modify: `src/main/lib/ai/agent-x/pm-coordinator.ts` (after a delegation completes) OR `execution-engine.ts` (`runDelegatedTask`)
- Test: extend `employee-loop.test.ts` or add `agent-memory.test.ts`

Spec §3.6: first time wiring memory writes. After an employee finishes a delegated task, store a compact memory row (`source: 'task'`) summarizing what they did, so future rounds get it as context.

- [ ] **Step 1: Write the failing test** (`src/main/lib/ai/agent-x/agent-memory.test.ts`)

```typescript
import { describe, expect, it, vi } from 'vitest'
const createAgentMemory = vi.fn(async () => ({ id: 'mem' }))
vi.mock('../../db/agent-x-queries', () => ({ createAgentMemory }))
const { rememberTaskOutcome } = await import('./agent-memory')

describe('rememberTaskOutcome', () => {
  it('writes a task-source memory with a truncated value', async () => {
    await rememberTaskOutcome(
      'a1',
      'Build the Q2 report',
      'Compiled revenue tables and a summary.'
    )
    expect(createAgentMemory).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'a1', source: 'task' })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/agent-x/agent-memory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/main/lib/ai/agent-x/agent-memory.ts`**

```typescript
import { createAgentMemory } from '../../db/agent-x-queries'

/** Persist a compact "what I did" memory after an employee finishes a task. */
export async function rememberTaskOutcome(
  agentId: string,
  instructions: string,
  output: string
): Promise<void> {
  await createAgentMemory({
    agentId,
    key: `task:${instructions.slice(0, 60)}`,
    value: {
      instructions: instructions.slice(0, 200),
      outcome: output.slice(0, 500)
    },
    source: 'task',
    confidence: 0.7
  })
}
```

- [ ] **Step 4: Call it from `runDelegatedTask`** (in `execution-engine.ts`) right after a successful `runEmployeeLoop`, before returning:

```typescript
import { rememberTaskOutcome } from './agent-memory'
// ... after `const output = await runEmployeeLoop(...)`:
await rememberTaskOutcome(agentId, instructions, output)
```

And inject memories into the employee system prompt: in `employee-loop.ts`, before building `systemPrompt`, load `getAgentMemories(agent.id)` and append a short "Past experience:" block (cap to ~5 most recent). Add the import and a few lines:

```typescript
import { getAgentMemories } from '../../db/agent-x-queries'
// ...
const memories = await getAgentMemories(agent.id)
const memoryBlock = memories.length
  ? '\n\nPast experience:\n' +
    memories
      .slice(0, 5)
      .map((m) => `- ${JSON.stringify(m.value)}`)
      .join('\n')
  : ''
const systemPrompt =
  buildEmployeeSystemPrompt(agent) + memoryBlock + skillsContent
```

- [ ] **Step 5: Run tests**

Run: `pnpm test src/main/lib/ai/agent-x/agent-memory.test.ts && pnpm typecheck:node`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/lib/ai/agent-x/agent-memory.ts src/main/lib/ai/agent-x/agent-memory.test.ts src/main/lib/ai/agent-x/execution-engine.ts src/main/lib/ai/agent-x/employee-loop.ts
git commit -m "feat(agent-x): employees accumulate and reuse task memory"
```

### Task 6.2: Finalize default avatar style (visual check)

**Files:**

- Modify: `src/shared/constants/avatar.ts` (only if the visual check changes the default)

- [ ] **Step 1: Render samples**

Run `pnpm dev`, open Agent X → 员工 → 新建, and in the editor cycle the three styles (`notionists` / `thumbs` / `adventurer`) with a few rerolls. Confirm the default reads as people/characters at 32–48px.

- [ ] **Step 2: Lock the default**

If a different style reads better, set `DEFAULT_AVATAR_STYLE` accordingly. Otherwise leave `notionists`.

- [ ] **Step 3: Commit (if changed)**

```bash
git add src/shared/constants/avatar.ts
git commit -m "chore(agent-x): finalize default avatar style" || echo "no change"
```

### Task 6.3: End-to-end manual verification + format/lint gate

- [ ] **Step 1: Full quality gate**

Run: `pnpm typecheck && pnpm test && pnpm lint && pnpm format:check`
Expected: all PASS. Run `pnpm format` then re-commit if formatting changes anything.

- [ ] **Step 2: Manual smoke test** (`pnpm dev`)

Verify, in order:

1. Agent X opens on the **工作群 (chat)** page with three columns.
2. Create a group → send "帮我调研一下 X 并写个简短报告".
3. PM bubble streams; PM either recruits an employee (member appears in the right panel via `member_joined`) or delegates to an existing one; employee bubble streams with avatar/name/team.
4. PM posts a final summary. Reload the page → history persists (messages came from DB, not just SSE).
5. Add a knowledge doc; ask a question whose answer is in it → PM/employee uses `searchKnowledgeBase`.
6. Trigger an `askUser` path (e.g. an ambiguous request) → the inline prompt appears; answering resumes the PM.
7. Open **Costs** → numbers reflect only agent-x executions (not your normal chat usage).

- [ ] **Step 3: Commit any fixups**

```bash
git add -A && git commit -m "chore(agent-x): final polish after e2e verification" || echo "nothing to commit"
```

---

## Self-Review (run against the spec before handing off)

**Spec coverage map:**

- §3.1 agent reshape → Task 1.1 ✓
- §3.2 conversation → Task 1.1 + 2.1 ✓
- §3.3 message (named `conversationMessage`) → Task 1.1 + 2.1 ✓
- §3.4 task reshape (`conversationId`, drop `assignedDepartmentId`) → Task 1.1 ✓
- §3.5 taskExecution as Costs source → tokenUsage now populated (Task 2.8) ✓
- §3.6 agentMemory first write → Task 6.1 ✓
- §3.7 knowledgeDoc → Task 1.1 + 2.2 ✓
- §3.8 drop department → Task 1.1 + 2.13 ✓
- §4 PM loop (delegate/recruit/searchKB/askUser, review/correct, lifecycle, v1 serial) → Tasks 2.9–2.12 ✓
- §4.5 retire auto-router/auto-fill/smart-dispatch → Task 2.13 ✓
- §5 scheduler into chat → Task 4.1 ✓
- §6 SSE events + conversation channel → Tasks 2.5, 2.6, 3.3 ✓
- §7 frontend pages/components/retired → Tasks 3.1–3.8 ✓
- §8 DiceBear avatars → Tasks 0.1, 0.2, 3.4, 6.2 ✓
- §9 KB stub + searchKnowledgeBase → Tasks 2.2, 2.7, 3.7 ✓
- §10 Costs fix (agent-x only) → Tasks 2.12 (`aggregateCosts`/`getAgentXCostRows`), 5.1 ✓
- §11 migration → Task 1.2 ✓
- §12 error handling (no silent failures) → employee loop + PM loop re-throw/`conversation_error` (Tasks 2.8, 2.11) ✓
- §13 tests → TDD tasks throughout (backend); UI verified via typecheck + manual ✓
- §14 build order → phases reordered slightly (Phase 4 scheduler runs right after 2.13 to keep node typecheck green) ✓

**Type consistency check:** `runEmployeeLoop` / `runDelegatedTask` / `runPmCoordinator` signatures are referenced consistently; `SseEmitter` is defined once in `employee-loop.ts` and imported elsewhere; `conversationMessage` table/type name is used everywhere (never the chat `message` table); `tokenUsage` shape `{inputTokens, outputTokens, cost?}` is consistent between schema (1.1), employee loop write (2.8), and cost aggregation (2.12).

**Known scope-outs (spec §15, do not implement):** true multi-employee parallelism, real RAG, shadow agents/preemption, per-conversation custom PM.
