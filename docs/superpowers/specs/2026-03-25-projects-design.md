# Projects Feature Design Spec

## Overview

Projects is a feature that allows users to organize chats into curated workspaces, each with its own knowledge base (documents) and custom instructions. Inspired by similar features in ChatGPT and Claude, adapted to Exodus's existing architecture.

## Prerequisites

**RAG infrastructure does not currently exist in the codebase.** The `resource` and `embedding` tables existed in the initial SQL migration (`resources/drizzle/0000_absurd_tony_stark.sql`) but have been removed from the Drizzle schema and there is no RAG application code (`src/main/lib/ai/rag/` is empty, no RAG routes exist).

This spec is split into two phases:

- **Phase 1**: Project grouping, custom instructions, sidebar/UI — no RAG dependency
- **Phase 2**: Per-project knowledge base (requires RAG pipeline to be built/restored first)

Phase 2 is documented here for completeness but will be implemented separately after the RAG pipeline exists.

## Requirements Summary

- **Project as a container**: groups related chats together with metadata
- **Per-project knowledge base**: layered on top of global RAG (Phase 2)
- **Per-project custom instructions**: free-form text + structured fields, injected into the system prompt
- **Sidebar integration**: new "Projects" tab alongside existing "Chats" tab
- **Single ownership**: a chat belongs to at most one project (or none)
- **Cascade delete**: deleting a project removes all its chats and associated data
- **Automatic inheritance**: new chats in a project inherit instructions by default
- **Per-chat opt-out**: individual chats can disable project instructions
- **No document limits**: unlimited uploads per project (Phase 2)

---

## 1. Database Schema

### New `project` table

| Column                   | Type      | Notes                                             |
| ------------------------ | --------- | ------------------------------------------------- |
| `id`                     | UUID      | PK, `gen_random_uuid()`                           |
| `name`                   | text      | Required, project name                            |
| `description`            | text      | Optional description                              |
| `instructions`           | text      | Free-form custom instructions                     |
| `structuredInstructions` | jsonb     | `{ tone?, role?, responseFormat?, constraints? }` |
| `createdAt`              | timestamp | `defaultNow()`                                    |
| `updatedAt`              | timestamp | `defaultNow()`                                    |

### Modify `chat` table

- Add `projectId` (UUID, nullable, FK → `project.id`, `ON DELETE CASCADE`)
- Add `useProjectInstructions` (boolean, default `true`)
- Add index: `index('chat_project_idx').on(chat.projectId)`

### Cascade behavior — application-level deletion

The existing `message.chatId` and `vote.chatId` FKs use `ON DELETE no action` (no cascade). Rather than migrating these FKs, project deletion uses **application-level cascade** matching the existing `deleteChatById()` pattern:

```
deleteProject(id):
  1. Find all chats where projectId = id
  2. For each chat: delete votes → delete messages → delete chat (existing pattern)
  3. Delete the project row
  4. (Phase 2: delete project resources → embeddings)
```

This is wrapped in a transaction for atomicity.

### `updatedAt` management

`updatedAt` is explicitly set by the application on:

- `PUT /api/project/:id` (direct project update)
- New chat created in project
- (Phase 2: document uploaded to project)

### Phase 2 schema additions (when RAG pipeline exists)

**New `resource` table** (to be created with RAG):

- Add `projectId` (UUID, nullable, FK → `project.id`, `ON DELETE CASCADE`)
- Resources with `projectId = null` are global

**New `embedding` table** (to be created with RAG):

- Add `projectId` (UUID, nullable, FK → `project.id`, `ON DELETE CASCADE`)
- Denormalized from `resource` for query performance
- Add index: `index('embedding_project_idx').on(embedding.projectId)`
- Resources cannot be moved between projects (delete and re-upload instead)

---

## 2. Backend API Routes

### New `/api/project` route

| Method   | Path               | Description                                                      |
| -------- | ------------------ | ---------------------------------------------------------------- |
| `GET`    | `/api/project`     | List all projects (ordered by `updatedAt` DESC)                  |
| `GET`    | `/api/project/:id` | Get project by ID (includes chat count)                          |
| `POST`   | `/api/project`     | Create project (name, description, instructions)                 |
| `PUT`    | `/api/project/:id` | Update project metadata/instructions (partial updates supported) |
| `DELETE` | `/api/project/:id` | Delete project (application-level cascade)                       |

### Zod validation schemas

New file `src/main/lib/server/schemas/project.ts`:

```typescript
const structuredInstructionsSchema = z.object({
  tone: z.string().optional(),
  role: z.string().optional(),
  responseFormat: z.string().optional(),
  constraints: z.string().optional()
})

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  structuredInstructions: structuredInstructionsSchema.optional()
})

const updateProjectSchema = createProjectSchema.partial()
```

Also export `structuredInstructionsSchema` from `src/shared/schemas/` for frontend reuse.

### Modified existing routes

**`POST /api/chat`** (chat streaming):

- Accept optional `projectId` in the POST body (`postRequestBodySchema` updated with `projectId: z.string().uuid().optional()`)
- When `projectId` is set and `useProjectInstructions` is true: load project instructions and prepend to system prompt

**`GET /api/history`**:

- Add optional `?projectId=xxx` query param to filter chats by project
- No param returns all chats as before

### Phase 2 route modifications (when RAG exists)

**`POST /api/rag`** (upload):

- Accept optional `projectId` when uploading documents
- Pass `projectId` through chunking and embedding pipeline

**`POST /api/rag/retrieve`**:

- When `projectId` is provided: search project embeddings first, merge with global results

---

## 3. System Prompt Injection

### Injection order

```
1. Global system prompt (existing)
2. Project free-form instructions (if projectId set & chat hasn't opted out)
3. Project structured instructions (formatted, non-empty fields only)
4. Per-chat context (memories, session summary — existing)
```

### Structured instructions template

```
Role: {role}
Tone: {tone}
Response Format: {responseFormat}
Constraints: {constraints}
```

Only non-empty fields are included in the output.

### Per-chat opt-out

- `useProjectInstructions` boolean on `chat` table (default `true`)
- When `false`, project instructions are skipped but project RAG still works (Phase 2)
- Toggled via a switch in chat header or chat settings dropdown

---

## 4. RAG Integration — Phase 2 (Layered Retrieval)

> **Blocked on**: RAG pipeline implementation (resource/embedding tables, chunking, embedding generation, retrieval code)

### Upload flow

- From project Knowledge tab: documents tagged with `projectId`
- From global RAG page: `projectId = null` (global)
- Chunking and embedding pipeline passes `projectId` through

### Retrieval flow

**Chat with `projectId`:**

Two separate queries to preserve HNSW index usage (a `CASE` expression in `ORDER BY` would bypass the index):

```sql
-- Query 1: top-K from project
SELECT *, embedding <=> $vector AS dist FROM embedding
WHERE projectId = $pid ORDER BY dist LIMIT $k;

-- Query 2: top-K from global
SELECT *, embedding <=> $vector AS dist FROM embedding
WHERE projectId IS NULL ORDER BY dist LIMIT $k;
```

Merge in application code: project results boosted (distance \* 0.8), then combined and sorted, return top-K overall.

**Chat without project:**

- Current behavior unchanged — query global embeddings only

---

## 5. Frontend Architecture

### Sidebar Changes

**Tab bar at top of sidebar:**

- Two tabs: **"Chats"** (default, current time-grouped view) | **"Projects"**
- Persisted via `sidebarTabAtom: 'chats' | 'projects'`

**Projects tab content:**

- "New Project" button at top
- List of projects as collapsible sections
- Each section shows: project name, chat count, expand arrow
- Expanded: project's chats (sorted by recent), "New chat in project" button
- Click project name → opens project detail page

**Chats tab:**

- Unchanged — all chats grouped by time
- Chats belonging to a project show a small project badge/tag

### New Pages/Views

**Project Detail page** (`/project/:id`):

- Header: editable project name, description
- Tabs within the page:
  - **Chats** — list of chats in project, "New Chat" button
  - **Knowledge** — upload/manage documents (Phase 2, placeholder tab for now)
  - **Instructions** — textarea + structured mode toggle (tone, role, responseFormat, constraints)

### New Chat Flow

- Starting chat from project auto-sets `projectId`
- Chat header shows project name as breadcrumb
- Indicator badge shows "Project instructions active"
- Per-chat toggle to disable project instructions

### Jotai Stores

New atoms:

- `sidebarTabAtom` — `'chats' | 'projects'`
- `activeProjectIdAtom` — currently selected project

### SWR Data Fetching

- `useSWR('/api/project')` — project list
- `useSWR('/api/project/:id')` — project detail
- `useSWR('/api/history?projectId=xxx')` — chats filtered by project

---

## 6. Frontend Routes

| Path           | Component       | Description                       |
| -------------- | --------------- | --------------------------------- |
| `/project/:id` | `ProjectDetail` | Project management page with tabs |

Chat routes remain unchanged — `/chat/:id` is the canonical chat URL. Project context is resolved from the chat's `projectId` FK, not from the URL path. This avoids URL duplication and SWR cache inconsistency.

Existing routes unchanged:

- `/` — Home (new chat, no project)
- `/chat/:id` — Chat detail (project context loaded from chat record)

---

## 7. Key Files to Modify

### Backend

- `src/main/lib/db/schema.ts` — add `project` table, modify `chat` table
- `src/main/lib/db/queries.ts` — add project CRUD queries, modify chat queries for projectId filtering
- `src/main/lib/server/app.ts` — register new project route
- `src/main/lib/server/routes/project.ts` — new project route handler
- `src/main/lib/server/routes/chat.ts` — inject project instructions into system prompt
- `src/main/lib/server/routes/history.ts` — add projectId query param filtering
- `src/main/lib/server/schemas/project.ts` — new Zod validation schemas
- `src/main/lib/server/schemas/chat.ts` — add `projectId` to `postRequestBodySchema`

### Frontend

- `src/renderer/layouts/chat-layout/app-sidebar.tsx` — add tab bar
- `src/renderer/layouts/chat-layout/nav-histories.tsx` — add project badge to chats
- New: `src/renderer/layouts/chat-layout/nav-projects.tsx` — project list in sidebar
- New: `src/renderer/containers/project-detail.tsx` — project detail page
- New: `src/renderer/services/project.ts` — project API service
- `src/renderer/stores/chat.ts` — add new atoms
- `src/renderer/routes/index.ts` — add project routes

### Shared

- `src/shared/types/db.ts` — add `Project` type export
- `src/shared/schemas/structured-instructions.ts` — reusable Zod schema for structured instructions

---

## 8. Naming note

The existing `memoryTypeEnum` in the schema includes a `'project'` value for the personalization/memory system. This is a different concept from the Projects feature. They coexist without conflict — the memory type describes user memories about their projects (free-form), while the `project` table is the organizational container.
