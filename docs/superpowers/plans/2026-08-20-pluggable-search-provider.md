# Pluggable Search Provider (Elasticsearch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chat-history full-text search pluggable — PGlite's built-in
full-text search stays the always-on, zero-config default; a self-hosted or
cloud Elasticsearch cluster becomes an optional, user-configured upgrade
(primarily to fix CJK search, which PGlite's `simple` tsvector config can't
segment).

**Architecture:** A `SearchProvider` interface with two implementations
(PGlite, Elasticsearch). PGlite indexing (`message.searchText`, populated at
write time) is unconditional and authoritative. Elasticsearch indexing is
additive (fire-and-forget on write, only when configured). Querying tries
Elasticsearch first when configured, falling back to PGlite on any failure
so search never goes dark.

**Tech Stack:** Drizzle ORM (PGlite/Postgres), `@elastic/elasticsearch`
(new dependency), Hono routes, React Hook Form + Zod (settings UI).

**Spec:** `docs/superpowers/specs/2026-08-20-pluggable-search-provider-design.md`

## Global Constraints

- PGlite indexing (`message.searchText`) is unconditional — every message
  write populates it regardless of Elasticsearch configuration. It is the
  durable baseline the app never depends on Elasticsearch for.
- Elasticsearch indexing is additive-only: a failed Elasticsearch write
  never fails the chat request and never blocks on the critical path
  (fire-and-forget, matching `saveArtifact(...).catch(() => {})` in
  `src/main/lib/ai/calling-tools/create-artifact.ts`).
- Any Elasticsearch failure at query time (unreachable, auth error,
  timeout) falls back to the PGlite result for that request — logged, not
  surfaced as a UI error.
- Only `type: 'text'` content blocks from `role: 'user'`/`role: 'assistant'`
  messages are indexed. `thinking` blocks and `role: 'toolResult'` messages
  (web search payloads, terminal output, artifacts, deep research, etc.)
  are excluded from both providers.
- `/api/chat/search`'s request/response contract does not change.
  `src/renderer/layouts/chat-layout/search-dialog.tsx` requires zero edits.
- New user-facing strings default to English (per CLAUDE.md).
- Reuse existing `@/components/ui` (shadcn) primitives — no hand-rolled
  form controls.
- `pnpm format` → `pnpm lint` → `pnpm typecheck` → `pnpm test` must pass
  before every commit (husky pre-commit hook).
- New interactive elements that get their own Playwright coverage need a
  `TEST_IDS` entry + `data-testid`, referenced from that test (CLAUDE.md
  checkpoint rule). Plain form fields already covered by an API-level test
  (matching the existing `web-search.tsx`/`s3.tsx` convention) do not need
  test ids.

---

### Task 1: Elasticsearch settings schema + DB column

**Files:**

- Modify: `src/shared/schemas/settings-schema.ts`
- Modify: `src/main/lib/db/schema.ts`
- Test: `tests/api/settings.spec.ts`

**Interfaces:**

- Produces: `ElasticsearchSchema`, `SearchSchema` (Zod, exported from
  `settings-schema.ts`); `search` jsonb column on the `settings` table
  typed `z.infer<typeof SearchSchema> | null`.

- [ ] **Step 1: Add `ElasticsearchSchema`/`SearchSchema` to the settings schema**

In `src/shared/schemas/settings-schema.ts`, add after `WebSearchSchema`
(around line 75):

```ts
export const ElasticsearchSchema = z.object({
  url: optionalUrl,
  username: z.string().nullish(),
  password: z.string().nullish(),
  indexName: z.string().nullish() // defaults to 'exodus-messages' if unset
})

export const SearchSchema = z.object({
  elasticsearch: ElasticsearchSchema.nullish()
})
```

Then add `search: SearchSchema.nullish()` to `SettingsSchema` (around line
184, alongside `webSearch: WebSearchSchema.nullish()`).

- [ ] **Step 2: Add the `search` column to the `settings` table**

In `src/main/lib/db/schema.ts`, add `SearchSchema` to the existing import
from `@shared/schemas/settings-schema` (line 2-14):

```ts
import {
  AudioSchema,
  DeepResearchSchema,
  GoogleCloudSchema,
  ImageSchema,
  MemoryLayerSchema,
  PersonalitySchema,
  ProviderConfigSchema,
  ProvidersSchema,
  S3Schema,
  SearchSchema,
  ToolsSchema,
  WebSearchSchema
} from '@shared/schemas/settings-schema'
```

Add the column to the `settings` table definition (around line 139,
alongside `webSearch`):

```ts
  search: jsonb('search').$type<z.infer<typeof SearchSchema>>(),
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `resources/drizzle/0008_<generated-name>.sql`
containing `ALTER TABLE "settings" ADD COLUMN "search" jsonb;` — no other
changes.

- [ ] **Step 4: Extend the settings API test**

In `tests/api/settings.spec.ts`, add a new test after "updates web search
config" (mirror that test's shape exactly):

```ts
test('POST /api/settings updates search config', async ({ api }) => {
  await api.updateSettings({
    search: {
      elasticsearch: {
        url: process.env.ELASTIC_URL,
        username: process.env.ELASTIC_USERNAME,
        password: process.env.ELASTIC_PASSWORD
      }
    }
  })

  const { data } = await api.getSettings()
  const search = data.search as { elasticsearch: Record<string, string> }
  expect(search.elasticsearch.url).toBe(process.env.ELASTIC_URL)
  expect(search.elasticsearch.username).toBe(process.env.ELASTIC_USERNAME)
})
```

This test requires `.env.test`'s `ELASTIC_URL`/`ELASTIC_USERNAME` to be
non-empty strings to make a meaningful assertion — they're already present
in the gitignored `.env.test` in this repo, so no new setup is needed. If
`ELASTIC_URL` were unset, `optionalUrl`'s validation would reject
`undefined` being sent as an explicit empty string, but `undefined` itself
is accepted by `.nullish()` — the assertions would then compare
`undefined === undefined` and still pass. No `test.skip` guard is needed
for this test (unlike ones that hit a live Elasticsearch cluster over the
network — this one only round-trips through settings storage).

- [ ] **Step 5: Run the test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass, including the new test (run it directly first with
`pnpm test tests/api/settings.spec.ts` if you want faster iteration — note
this file lives under `tests/api/`, which requires the dev server running
on `localhost:60223`; consult existing `tests/api/` tests for how they're
invoked in this repo, e.g. via `playwright test` rather than `vitest`).

```bash
git add src/shared/schemas/settings-schema.ts src/main/lib/db/schema.ts resources/drizzle/ tests/api/settings.spec.ts
git commit -m "feat(search): add Elasticsearch settings schema and column"
```

---

### Task 2: `searchText` column, index swap, `extractSearchableText`, backfill

**Files:**

- Modify: `src/main/lib/db/schema.ts`
- Create: `src/main/lib/search/extract-searchable-text.ts`
- Test: `tests/unit/main/lib/search/extract-searchable-text.test.ts`
- Migration: generated + hand-edited

**Interfaces:**

- Produces: `extractSearchableText(message: { role: string; content: unknown }): string | null`
  — used by Task 3.
- Produces: `message.searchText: string | null` column, GIN index on
  `to_tsvector('simple', searchText)` (replaces the old index on `content`).

- [ ] **Step 1: Write the failing test for `extractSearchableText`**

Create `tests/unit/main/lib/search/extract-searchable-text.test.ts`:

```ts
import { extractSearchableText } from '@main/lib/search/extract-searchable-text'
import { describe, expect, it } from 'vitest'

describe('extractSearchableText', () => {
  it('returns null for toolResult messages regardless of content', () => {
    expect(
      extractSearchableText({
        role: 'toolResult',
        content: [{ type: 'text', text: 'web search results here' }]
      })
    ).toBeNull()
  })

  it('joins text blocks and skips thinking blocks', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'internal reasoning' },
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'world' }
        ]
      })
    ).toBe('Hello\nworld')
  })

  it('returns the string as-is when content is a plain string', () => {
    expect(
      extractSearchableText({ role: 'user', content: 'plain string content' })
    ).toBe('plain string content')
  })

  it('returns null for empty string content', () => {
    expect(extractSearchableText({ role: 'user', content: '' })).toBeNull()
  })

  it('returns null for an empty content array', () => {
    expect(extractSearchableText({ role: 'assistant', content: [] })).toBeNull()
  })

  it('returns null when only thinking blocks are present', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'internal reasoning' }]
      })
    ).toBeNull()
  })

  it('excludes text blocks with empty text', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [
          { type: 'text', text: '' },
          { type: 'text', text: 'kept' }
        ]
      })
    ).toBe('kept')
  })

  it('returns null for non-array, non-string content', () => {
    expect(
      extractSearchableText({ role: 'user', content: { weird: true } })
    ).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/main/lib/search/extract-searchable-text.test.ts`
Expected: FAIL — `Cannot find module '@main/lib/search/extract-searchable-text'`

- [ ] **Step 3: Implement `extractSearchableText`**

Create `src/main/lib/search/extract-searchable-text.ts`:

```ts
interface SearchableMessage {
  role: string
  content: unknown
}

function isNonEmptyTextBlock(
  block: unknown
): block is { type: 'text'; text: string } {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as { type?: unknown }).type === 'text' &&
    typeof (block as { text?: unknown }).text === 'string' &&
    (block as { text: string }).text !== ''
  )
}

/**
 * Extracts the text actually shown in the chat bubble for a message — the
 * same content `search-dialog.tsx` displays. Excludes `thinking` blocks and
 * all `toolResult` messages (web search payloads, tool output, etc.) so
 * search only matches what a user would recognize seeing in the transcript.
 */
export function extractSearchableText(
  message: SearchableMessage
): string | null {
  if (message.role === 'toolResult') return null

  const { content } = message
  if (typeof content === 'string') {
    return content === '' ? null : content
  }

  if (!Array.isArray(content)) return null

  const text = content
    .filter(isNonEmptyTextBlock)
    .map((block) => block.text)
    .join('\n')

  return text === '' ? null : text
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/unit/main/lib/search/extract-searchable-text.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Add the `searchText` column and swap the search index**

In `src/main/lib/db/schema.ts`, modify the `message` table (around line
70-104):

```ts
export const message = pgTable(
  'message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    role: varchar('role').notNull(), // 'user' | 'assistant' | 'toolResult'
    content: jsonb('content').notNull(), // content array for the message
    // Extracted, indexable text — only `text` blocks from user/assistant
    // messages; excludes `thinking` blocks and toolResult rows entirely.
    // Populated by extractSearchableText() in saveMessages().
    searchText: text('searchText'),
    // assistant-specific fields
    usage: jsonb('usage').$type<Usage>(),
    api: varchar('api'),
    provider: varchar('provider'),
    model: varchar('model'),
    stopReason: varchar('stopReason'),
    errorMessage: varchar('errorMessage'),
    // toolResult-specific fields
    toolCallId: varchar('toolCallId'),
    toolName: varchar('toolName'),
    details: jsonb('details'),
    isError: boolean('isError'),
    durationMs: integer('durationMs'),
    createdAt: timestamp('createdAt').defaultNow().notNull()
  },
  (table) => [
    index('message_search_index').using(
      'gin',
      sql`to_tsvector('simple', ${table.searchText})`
    )
  ]
)
```

(Only the two changes: the new `searchText` field, and the index
expression now references `table.searchText` instead of `table.content`.)

- [ ] **Step 6: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `resources/drizzle/0009_<generated-name>.sql`
containing, in some order:

```sql
ALTER TABLE "message" ADD COLUMN "searchText" text;
DROP INDEX "message_search_index";
CREATE INDEX "message_search_index" ON "message" USING gin (to_tsvector('simple', "searchText"));
```

- [ ] **Step 7: Hand-edit the migration to backfill existing rows**

Open the generated file from Step 6. Insert this statement immediately
after the `ALTER TABLE "message" ADD COLUMN "searchText" text;` line and
before the `DROP INDEX`/`CREATE INDEX` statements — the backfill must run
before the index is (re)built so the GIN index picks up real values instead
of indexing an all-NULL column and updating row-by-row afterward:

```sql
UPDATE "message"
SET "searchText" = CASE
  WHEN jsonb_typeof("content") = 'array' THEN (
    SELECT NULLIF(string_agg(elem->>'text', E'\n'), '')
    FROM jsonb_array_elements("content") AS elem
    WHERE elem->>'type' = 'text' AND COALESCE(elem->>'text', '') <> ''
  )
  WHEN jsonb_typeof("content") = 'string' THEN NULLIF("content"#>>'{}', '')
  ELSE NULL
END
WHERE "role" IN ('user', 'assistant');
```

This mirrors `extractSearchableText()` exactly: `toolResult` rows are
skipped (left `NULL`, matching the column default), array content joins
`text`-block text with `\n` excluding empty strings, and string content
passes through as-is (via `jsonb_typeof(...) = 'string'`, extracting the
raw text with `#>>'{}'`).

- [ ] **Step 8: Verify the migration applies and backfills correctly**

Run: `pnpm dev` (or however this project runs pending migrations locally —
migrations execute via `src/main/lib/db/migrate.ts` on app/test startup).
After it starts, stop it, then inspect the database directly (e.g. via a
one-off script using the same `db`/`pglite` export from
`src/main/lib/db/db.ts`, or any Postgres client pointed at
`~/.exodus/database`) to confirm: existing message rows with `role IN
('user','assistant')` and array/string `content` now have a non-null
`searchText`; `toolResult` rows have `searchText IS NULL`.

- [ ] **Step 9: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/main/lib/db/schema.ts src/main/lib/search/extract-searchable-text.ts tests/unit/main/lib/search/extract-searchable-text.test.ts resources/drizzle/
git commit -m "feat(search): add searchText column, backfill migration, extractSearchableText"
```

---

### Task 3: `SearchProvider` type + PGlite provider + write/query rewire

**Files:**

- Create: `src/main/lib/search/types.ts`
- Create: `src/main/lib/search/providers/pglite-search.ts`
- Modify: `src/main/lib/db/queries.ts`

**Interfaces:**

- Consumes: `extractSearchableText()` from Task 2
  (`src/main/lib/search/extract-searchable-text.ts`).
- Produces: `SearchHit` type, `SearchProvider` interface
  (`src/main/lib/search/types.ts`) — consumed by Tasks 4 and 5.
- Produces: `pgliteSearchProvider: SearchProvider`
  (`src/main/lib/search/providers/pglite-search.ts`) — consumed by Task 5.
- Modifies: `saveMessages({ messages })` in `queries.ts` now takes
  `Array<Omit<Message, 'searchText'>>` (was `Array<Message>`) — callers no
  longer need to know about `searchText`, it's computed internally.

- [ ] **Step 1: Define the `SearchProvider` types**

Create `src/main/lib/search/types.ts`:

```ts
import type { Message } from '../db/schema'

export type SearchHit = Message & { title: string }

export interface SearchProvider {
  indexMessage(message: Message): Promise<void>
  deleteByChatId(chatId: string): Promise<void>
  search(query: string): Promise<SearchHit[]>
}
```

- [ ] **Step 2: Update `saveMessages` to compute `searchText`**

In `src/main/lib/db/queries.ts`, add the import (alongside the existing
`logDbError` import block, around line 5):

```ts
import { extractSearchableText } from '../search/extract-searchable-text'
```

Replace `saveMessages` (currently lines 97-104):

```ts
export async function saveMessages({
  messages
}: {
  messages: Array<Omit<Message, 'searchText'>>
}) {
  try {
    const rows = messages.map((m) => ({
      ...m,
      searchText: extractSearchableText(m)
    }))
    return await db.insert(message).values(rows)
  } catch (error) {
    logDbError('Failed to save messages', error)
    throw error
  }
}
```

- [ ] **Step 3: Point `fullTextSearchOnMessages` at `searchText`**

In `src/main/lib/db/queries.ts`, in `fullTextSearchOnMessages` (currently
around line 185-209), change the `where` clause from:

```ts
sql`to_tsvector('simple', ${message.content}) @@ websearch_to_tsquery('simple', ${query})`
```

to:

```ts
sql`to_tsvector('simple', ${message.searchText}) @@ websearch_to_tsquery('simple', ${query})`
```

No other change to that function — it still joins `chat.title` per hit and
returns the same shape, which now structurally matches `SearchHit` (`Message
& { title: string }`).

- [ ] **Step 4: Create the PGlite provider wrapper**

Create `src/main/lib/search/providers/pglite-search.ts`:

```ts
import { fullTextSearchOnMessages } from '../../db/queries'
import type { SearchProvider } from '../types'

/**
 * PGlite's own indexing happens at write time via the `searchText` column
 * populated in `saveMessages()` — this provider only serves queries; the
 * `indexMessage`/`deleteByChatId` methods exist to satisfy `SearchProvider`
 * but do no independent work (a chat's rows, and their GIN index entries,
 * are already removed by `deleteChatById`'s SQL DELETE).
 */
export const pgliteSearchProvider: SearchProvider = {
  async indexMessage() {},
  async deleteByChatId() {},
  async search(query) {
    return fullTextSearchOnMessages(query)
  }
}
```

- [ ] **Step 5: Verify existing chat call sites still typecheck**

`saveMessages` is called from `src/main/lib/server/routes/chat.ts:144` and
`:438`. Neither site needs to change — they build message objects without
a `searchText` field already, which now matches the new (narrower)
parameter type.

Run: `pnpm typecheck`
Expected: no errors in `chat.ts` or `queries.ts`.

- [ ] **Step 6: Run the existing search regression test**

This project already has an end-to-end search test:
`tests/api/chat-history.spec.ts` — `GET /api/chat/search finds messages by
keyword`. It sends a real chat message and searches for a unique keyword
in the response. Since the query path now runs through `searchText`
instead of `content`, this test verifies the rewire didn't break search.

Run: `pnpm test tests/api/chat-history.spec.ts`
Expected: PASS (requires `OPENAI_API_KEY` in `.env.test`, already present
per `tests/e2e/chat-e2e.spec.ts`'s skip-guard convention — if this test was
already passing before this task, it must still pass after).

- [ ] **Step 7: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/main/lib/search/types.ts src/main/lib/search/providers/pglite-search.ts src/main/lib/db/queries.ts
git commit -m "feat(search): add SearchProvider interface and PGlite provider"
```

---

### Task 4: `@elastic/elasticsearch` dependency + Elasticsearch provider

**Files:**

- Modify: `package.json` (new dependency)
- Modify: `src/main/lib/db/queries.ts` (new query function)
- Create: `src/main/lib/search/providers/elasticsearch-search.ts`
- Test: `tests/unit/main/lib/search/providers/elasticsearch-search.test.ts`

**Interfaces:**

- Consumes: `SearchProvider`, `SearchHit` from Task 3
  (`src/main/lib/search/types.ts`).
- Produces: `createElasticsearchProvider(config: ElasticsearchProviderConfig): SearchProvider`
  — consumed by Task 5.
- Produces: `getMessagesWithTitleByIds(ids: string[]): Promise<SearchHit[]>`
  in `queries.ts` — consumed only by the Elasticsearch provider (PGlite
  documents aren't duplicated into Elasticsearch; only `chatId`,
  `searchText`, `createdAt` are — so a hit's full row is re-fetched from
  PGlite by id after querying Elasticsearch for matching ids).

- [ ] **Step 1: Add the dependency**

Run: `pnpm add @elastic/elasticsearch`
Expected: `package.json`'s `dependencies` gains `@elastic/elasticsearch`,
`pnpm-lock.yaml` updates.

- [ ] **Step 2: Add `getMessagesWithTitleByIds` to queries.ts**

In `src/main/lib/db/queries.ts`, add near `fullTextSearchOnMessages`:

```ts
export async function getMessagesWithTitleByIds(
  ids: string[]
): Promise<Array<Message & { title: string }>> {
  try {
    if (ids.length === 0) return []
    const messages = await db
      .select()
      .from(message)
      .where(inArray(message.id, ids))

    return await Promise.all(
      messages.map(async (m) => {
        const chat = await getChatById({ id: m.chatId })
        return { ...m, title: chat.title }
      })
    )
  } catch (error) {
    logDbError('Failed to get messages by ids', error)
    throw error
  }
}
```

Add `inArray` to the existing `drizzle-orm` import (currently `import {
and, asc, desc, eq, sql } from 'drizzle-orm'` around line 3):

```ts
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
```

- [ ] **Step 3: Write the failing test for the Elasticsearch provider**

Create `tests/unit/main/lib/search/providers/elasticsearch-search.test.ts`:

```ts
import type { Message } from '@main/lib/db/schema'
import { describe, expect, it, vi } from 'vitest'

const mockIndex = vi.fn()
const mockSearch = vi.fn()
const mockDeleteByQuery = vi.fn()
const mockGetMessagesWithTitleByIds = vi.fn()

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({
    index: mockIndex,
    search: mockSearch,
    deleteByQuery: mockDeleteByQuery
  }))
}))

vi.mock('@main/lib/db/queries', () => ({
  getMessagesWithTitleByIds: mockGetMessagesWithTitleByIds
}))

const { createElasticsearchProvider } =
  await import('@main/lib/search/providers/elasticsearch-search')

const baseMessage: Message = {
  id: 'msg-1',
  chatId: 'chat-1',
  role: 'assistant',
  content: [{ type: 'text', text: 'hello' }],
  searchText: 'hello',
  usage: null,
  api: null,
  provider: null,
  model: null,
  stopReason: null,
  errorMessage: null,
  toolCallId: null,
  toolName: null,
  details: null,
  isError: null,
  durationMs: null,
  createdAt: new Date('2026-01-01')
}

describe('createElasticsearchProvider', () => {
  it('indexes a message with only chatId, searchText, createdAt', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.indexMessage(baseMessage)

    expect(mockIndex).toHaveBeenCalledWith({
      index: 'exodus-messages',
      id: 'msg-1',
      document: {
        chatId: 'chat-1',
        searchText: 'hello',
        createdAt: baseMessage.createdAt
      }
    })
  })

  it('skips indexing when searchText is null', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.indexMessage({ ...baseMessage, searchText: null })

    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('uses a custom index name when configured', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200',
      indexName: 'custom-index'
    })
    await provider.indexMessage(baseMessage)

    expect(mockIndex).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'custom-index' })
    )
  })

  it('deletes by chatId via a term query', async () => {
    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    await provider.deleteByChatId('chat-1')

    expect(mockDeleteByQuery).toHaveBeenCalledWith({
      index: 'exodus-messages',
      query: { term: { chatId: 'chat-1' } }
    })
  })

  it('searches and re-fetches full rows by returned ids', async () => {
    mockSearch.mockResolvedValue({
      hits: { hits: [{ _id: 'msg-1' }, { _id: 'msg-2' }] }
    })
    mockGetMessagesWithTitleByIds.mockResolvedValue([
      { ...baseMessage, title: 'Chat One' }
    ])

    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    const results = await provider.search('hello')

    expect(mockSearch).toHaveBeenCalledWith({
      index: 'exodus-messages',
      query: { match: { searchText: 'hello' } }
    })
    expect(mockGetMessagesWithTitleByIds).toHaveBeenCalledWith([
      'msg-1',
      'msg-2'
    ])
    expect(results).toEqual([{ ...baseMessage, title: 'Chat One' }])
  })

  it('returns an empty array without querying PGlite when there are no hits', async () => {
    mockSearch.mockResolvedValue({ hits: { hits: [] } })
    mockGetMessagesWithTitleByIds.mockClear()

    const provider = createElasticsearchProvider({
      url: 'http://localhost:9200'
    })
    const results = await provider.search('nomatch')

    expect(results).toEqual([])
    expect(mockGetMessagesWithTitleByIds).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test tests/unit/main/lib/search/providers/elasticsearch-search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the Elasticsearch provider**

Create `src/main/lib/search/providers/elasticsearch-search.ts`:

```ts
import { Client } from '@elastic/elasticsearch'

import { getMessagesWithTitleByIds } from '../../db/queries'
import type { Message } from '../../db/schema'
import type { SearchProvider } from '../types'

export interface ElasticsearchProviderConfig {
  url: string
  username?: string | null
  password?: string | null
  indexName?: string | null
}

const DEFAULT_INDEX_NAME = 'exodus-messages'

export function createElasticsearchProvider(
  config: ElasticsearchProviderConfig
): SearchProvider {
  const client = new Client({
    node: config.url,
    auth:
      config.username && config.password
        ? { username: config.username, password: config.password }
        : undefined
  })
  const indexName = config.indexName || DEFAULT_INDEX_NAME

  return {
    async indexMessage(message: Message) {
      if (!message.searchText) return
      await client.index({
        index: indexName,
        id: message.id,
        document: {
          chatId: message.chatId,
          searchText: message.searchText,
          createdAt: message.createdAt
        }
      })
    },

    async deleteByChatId(chatId: string) {
      await client.deleteByQuery({
        index: indexName,
        query: { term: { chatId } }
      })
    },

    async search(query: string) {
      const result = await client.search({
        index: indexName,
        query: { match: { searchText: query } }
      })
      const ids = result.hits.hits
        .map((hit) => hit._id)
        .filter((id): id is string => typeof id === 'string')
      if (ids.length === 0) return []
      return getMessagesWithTitleByIds(ids)
    }
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test tests/unit/main/lib/search/providers/elasticsearch-search.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 7: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add package.json pnpm-lock.yaml src/main/lib/db/queries.ts src/main/lib/search/providers/elasticsearch-search.ts tests/unit/main/lib/search/providers/elasticsearch-search.test.ts
git commit -m "feat(search): add Elasticsearch provider"
```

---

### Task 5: `resolveSearchProvider` + always-on indexing + query fallback + chat deletion cascade

**Files:**

- Create: `src/main/lib/search/resolve-search-provider.ts`
- Create: `src/main/lib/search/index-messages-in-background.ts`
- Modify: `src/main/lib/server/routes/chat.ts` (`/search` route, the two
  `saveMessages` call sites, and the chat-delete route — `deleteChatById`
  itself in `queries.ts` stays unchanged; see Step 8)
- Test: `tests/unit/main/lib/search/resolve-search-provider.test.ts`

**Interfaces:**

- Consumes: `pgliteSearchProvider` (Task 3),
  `createElasticsearchProvider` (Task 4).
- Produces:
  `resolveSearchProvider(settings: Settings): { elasticsearch: SearchProvider | null; pglite: SearchProvider }`
  — consumed by Task 6 (reindex/test-connection routes) and this task's
  `chat.ts` changes.
- Produces:
  `indexMessagesInBackground(messages: Message[], settings: Settings): void`
  — fire-and-forget, called from `chat.ts`'s two `saveMessages` call sites.

- [ ] **Step 1: Write the failing test for `resolveSearchProvider`**

Create `tests/unit/main/lib/search/resolve-search-provider.test.ts`:

```ts
import type { Settings } from '@main/lib/db/schema'
import { resolveSearchProvider } from '@main/lib/search/resolve-search-provider'
import { describe, expect, it } from 'vitest'

const baseSettings = { id: 'global' } as Settings

describe('resolveSearchProvider', () => {
  it('returns no elasticsearch provider when unconfigured', () => {
    const { elasticsearch, pglite } = resolveSearchProvider(baseSettings)
    expect(elasticsearch).toBeNull()
    expect(pglite).toBeDefined()
  })

  it('returns no elasticsearch provider when url is empty', () => {
    const settings = {
      ...baseSettings,
      search: { elasticsearch: { url: '' } }
    } as Settings
    const { elasticsearch } = resolveSearchProvider(settings)
    expect(elasticsearch).toBeNull()
  })

  it('returns an elasticsearch provider when url is set', () => {
    const settings = {
      ...baseSettings,
      search: { elasticsearch: { url: 'http://localhost:9200' } }
    } as Settings
    const { elasticsearch } = resolveSearchProvider(settings)
    expect(elasticsearch).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/main/lib/search/resolve-search-provider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolveSearchProvider`**

Create `src/main/lib/search/resolve-search-provider.ts`:

```ts
import type { Settings } from '../db/schema'
import { createElasticsearchProvider } from './providers/elasticsearch-search'
import { pgliteSearchProvider } from './providers/pglite-search'
import type { SearchProvider } from './types'

export interface ResolvedSearchProvider {
  /** null when Elasticsearch isn't configured. */
  elasticsearch: SearchProvider | null
  /** Always available — the unconditional baseline. */
  pglite: SearchProvider
}

export function resolveSearchProvider(
  settings: Settings
): ResolvedSearchProvider {
  const config = settings.search?.elasticsearch
  const elasticsearch =
    config?.url && config.url !== ''
      ? createElasticsearchProvider(config)
      : null

  return { elasticsearch, pglite: pgliteSearchProvider }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/unit/main/lib/search/resolve-search-provider.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement `indexMessagesInBackground`**

Create `src/main/lib/search/index-messages-in-background.ts`:

```ts
import type { Settings } from '../db/schema'
import { logger } from '../logger'
import type { Message } from '../db/schema'
import { resolveSearchProvider } from './resolve-search-provider'

/**
 * Fire-and-forget: indexes messages into Elasticsearch when configured.
 * Never awaited by callers — a failure here must never affect the chat
 * response, since PGlite's `searchText` column (populated in
 * `saveMessages()`) is already the durable, always-on search baseline.
 */
export function indexMessagesInBackground(
  messages: Message[],
  settings: Settings
): void {
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) return

  for (const msg of messages) {
    elasticsearch.indexMessage(msg).catch((error) => {
      logger.error('search', 'Failed to index message in Elasticsearch', {
        error: String(error)
      })
    })
  }
}
```

- [ ] **Step 6: Wire indexing into the chat route's two save sites**

In `src/main/lib/server/routes/chat.ts`, add the import alongside the
existing `db/queries` import block:

```ts
import { indexMessagesInBackground } from '../../search/index-messages-in-background'
```

At line 144, change:

```ts
const saveUserMsgPromise = saveMessages({
  messages: [toDbRow(userMessage, id)]
})
```

to:

```ts
const saveUserMsgPromise = saveMessages({
  messages: [toDbRow(userMessage, id)]
})
indexMessagesInBackground([toDbRow(userMessage, id)], c.get('settings'))
```

At line 438, change:

```ts
if (newMessages.length > 0) {
  await saveMessages({
    messages: newMessages.map((m) => toDbRow(m, id))
  })
}
```

to:

```ts
if (newMessages.length > 0) {
  const rows = newMessages.map((m) => toDbRow(m, id))
  await saveMessages({ messages: rows })
  indexMessagesInBackground(rows, c.get('settings'))
}
```

(`c` is in scope at both locations — both are inside the same route handler
closure. `toDbRow` is already imported in this file from `./chat-persistence`.)

- [ ] **Step 7: Rewire the `/search` route with fallback**

In `src/main/lib/server/routes/chat.ts`, replace the `/search` handler
(currently lines 70-77):

```ts
chat.get('/search', async (c) => {
  const query = c.req.query('query') ?? ''
  const settings = c.get('settings')
  const { elasticsearch, pglite } = resolveSearchProvider(settings)

  if (elasticsearch) {
    try {
      const result = await elasticsearch.search(query)
      return successResponse(c, result)
    } catch (error) {
      logger.error(
        'search',
        'Elasticsearch query failed, falling back to PGlite',
        {
          error: String(error)
        }
      )
    }
  }

  const result = await handleDatabaseOperation(
    () => pglite.search(query),
    'Failed to search messages'
  )
  return successResponse(c, result)
})
```

Add the import: `import { resolveSearchProvider } from '../../search/resolve-search-provider'`.
`fullTextSearchOnMessages` is no longer imported directly in `chat.ts` —
remove it from the `db/queries` import list if nothing else in the file
uses it (check with `grep -n fullTextSearchOnMessages
src/main/lib/server/routes/chat.ts` before removing).

- [ ] **Step 8: Cascade chat deletion to Elasticsearch**

In `src/main/lib/db/queries.ts`, `deleteChatById` cannot call
`resolveSearchProvider` directly — that would create a circular import
(`queries.ts` → `search/resolve-search-provider.ts` →
`search/providers/pglite-search.ts` → `queries.ts`). Instead, leave
`deleteChatById` unchanged (PGlite's own DELETE already removes the rows
and their index entries) and add the Elasticsearch cascade at the route
call site.

In `src/main/lib/server/routes/chat.ts`, change the delete handler
(currently lines 514-523):

```ts
chat.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')

  await handleDatabaseOperation(
    () => deleteChatById({ id }),
    'Failed to delete chat'
  )

  return deletionSuccessResponse(c, 'Chat')
})
```

to:

```ts
chat.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')

  await handleDatabaseOperation(
    () => deleteChatById({ id }),
    'Failed to delete chat'
  )

  const { elasticsearch } = resolveSearchProvider(c.get('settings'))
  if (elasticsearch) {
    elasticsearch.deleteByChatId(id).catch((error) => {
      logger.error('search', 'Failed to delete chat from Elasticsearch', {
        error: String(error)
      })
    })
  }

  return deletionSuccessResponse(c, 'Chat')
})
```

- [ ] **Step 9: Write the end-to-end Elasticsearch integration test**

This is the test that actually exercises the full Elasticsearch path
end-to-end: configure it via settings, send a chat message, and confirm
`/api/chat/search` finds it via Elasticsearch (not just PGlite). Create
`tests/api/search-elasticsearch.spec.ts`, following
`tests/api/chat-history.spec.ts`'s structure:

```ts
/**
 * API integration test: full-text search via a real Elasticsearch cluster.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Elasticsearch search', () => {
  test.skip(
    !process.env.ELASTIC_URL,
    'requires ELASTIC_URL env var to test against a real Elasticsearch cluster'
  )

  let cleanup: TestCleanup

  test.beforeAll(async () => {
    const api = new ApiClient()
    await injectOpenAiProvider(api)
    await api.updateSettings({
      search: {
        elasticsearch: {
          url: process.env.ELASTIC_URL,
          username: process.env.ELASTIC_USERNAME,
          password: process.env.ELASTIC_PASSWORD
        }
      }
    })
  })

  test.afterAll(async () => {
    const api = new ApiClient()
    await api.updateSettings({ search: { elasticsearch: { url: '' } } })
  })

  test.beforeEach(async ({ api }) => {
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('finds a message indexed through Elasticsearch', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const uniqueKeyword = `esxyzzy${Date.now()}`
    await api.sendChatMessage({
      chatId,
      text: `Remember this unique keyword: ${uniqueKeyword}`
    })

    // Elasticsearch indexing is fire-and-forget (Step 5/6 above), so the
    // document may not be searchable the instant the chat response
    // returns — poll briefly instead of asserting immediately.
    await expect
      .poll(
        async () => {
          const { data } = await api.searchMessages(uniqueKeyword)
          return data.length
        },
        { timeout: 10_000 }
      )
      .toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 10: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass, including `tests/api/chat-history.spec.ts`'s search
test (still exercises the PGlite path when Elasticsearch isn't configured
for that test's own settings state) and the new
`tests/api/search-elasticsearch.spec.ts` (skipped unless `ELASTIC_URL` is
set — it is, in this repo's gitignored `.env.test`).

```bash
git add src/main/lib/search/resolve-search-provider.ts src/main/lib/search/index-messages-in-background.ts src/main/lib/server/routes/chat.ts tests/unit/main/lib/search/resolve-search-provider.test.ts tests/api/search-elasticsearch.spec.ts
git commit -m "feat(search): wire resolveSearchProvider into chat routes with fallback"
```

---

### Task 6: Reindex + test-connection routes

**Files:**

- Modify: `src/main/lib/server/routes/settings.ts`
- Modify: `src/main/lib/db/queries.ts` (new `getAllSearchableMessages`)
- Test: `tests/api/search-elasticsearch-reindex.spec.ts`, possibly
  `tests/fixtures/api-client.ts` (see Step 4)

**Interfaces:**

- Consumes: `resolveSearchProvider` (Task 5), `getMessagesWithTitleByIds`
  is not needed here — instead a new `getAllSearchableMessages()` query.
- Produces: `POST /api/settings/search/test-connection`,
  `POST /api/settings/search/reindex` — consumed by Task 7's UI and this
  task's own reindex test.

- [ ] **Step 1: Add `getAllSearchableMessages` to queries.ts**

In `src/main/lib/db/queries.ts`, add near `getMessagesWithTitleByIds`:

```ts
export async function getAllSearchableMessages(): Promise<Message[]> {
  try {
    return await db
      .select()
      .from(message)
      .where(sql`${message.searchText} IS NOT NULL`)
  } catch (error) {
    logDbError('Failed to get searchable messages', error)
    throw error
  }
}
```

- [ ] **Step 2: Add the two routes**

In `src/main/lib/server/routes/settings.ts`, add imports:

```ts
import { ErrorCode } from '@shared/constants/error-codes'
import { ValidationError } from '@shared/errors/app-error'

import { getAllSearchableMessages } from '../../db/queries'
import { resolveSearchProvider } from '../../search/resolve-search-provider'
```

Add the routes before `export default settingsRouter`:

```ts
settingsRouter.post('/search/test-connection', async (c) => {
  const settings = c.get('settings')
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'Elasticsearch is not configured'
    )
  }

  try {
    // A no-op search doubles as a connectivity check without requiring a
    // separate client handle — any hits array (even empty) means the
    // cluster answered.
    await elasticsearch.search('')
    return successResponse(c, { ok: true })
  } catch (error) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      error instanceof Error
        ? `Failed to connect to Elasticsearch: ${error.message}`
        : 'Failed to connect to Elasticsearch'
    )
  }
})

settingsRouter.post('/search/reindex', async (c) => {
  const settings = c.get('settings')
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) {
    throw new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      'Elasticsearch is not configured'
    )
  }

  const rows = await handleDatabaseOperation(
    () => getAllSearchableMessages(),
    'Failed to load messages for reindexing'
  )

  for (const row of rows) {
    await elasticsearch.indexMessage(row)
  }

  return successResponse(c, { count: rows.length })
})
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Add an API test for the reindex route**

Every other Elasticsearch-touching capability in this plan has a gated
integration test (Task 1's settings round-trip, Task 5's search-via-ES
test) — this closes the same gap for reindexing. Create
`tests/api/search-elasticsearch-reindex.spec.ts`:

```ts
/**
 * API integration test: reindexing existing chat history into Elasticsearch.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Elasticsearch reindex', () => {
  test.skip(
    !process.env.ELASTIC_URL,
    'requires ELASTIC_URL env var to test against a real Elasticsearch cluster'
  )

  let cleanup: TestCleanup

  test.beforeAll(async () => {
    const api = new ApiClient()
    await injectOpenAiProvider(api)
  })

  test.afterAll(async () => {
    const api = new ApiClient()
    await api.updateSettings({ search: { elasticsearch: { url: '' } } })
  })

  test.beforeEach(async ({ api }) => {
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('reindex picks up messages saved before Elasticsearch was configured', async ({
    api
  }) => {
    // Elasticsearch is NOT configured yet — this message is only in PGlite.
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)
    const uniqueKeyword = `reindexxyzzy${Date.now()}`
    await api.sendChatMessage({
      chatId,
      text: `Remember this unique keyword: ${uniqueKeyword}`
    })

    // Now configure Elasticsearch and reindex.
    await api.updateSettings({
      search: {
        elasticsearch: {
          url: process.env.ELASTIC_URL,
          username: process.env.ELASTIC_USERNAME,
          password: process.env.ELASTIC_PASSWORD
        }
      }
    })
    const { status, data } = await api.post<{ count: number }>(
      '/api/settings/search/reindex'
    )
    expect(status).toBe(200)
    expect(data.count).toBeGreaterThanOrEqual(1)

    await expect
      .poll(
        async () => {
          const { data } = await api.searchMessages(uniqueKeyword)
          return data.length
        },
        { timeout: 10_000 }
      )
      .toBeGreaterThanOrEqual(1)
  })
})
```

Check `tests/fixtures/api-client.ts` for a generic `post<T>(path, body?)`
helper before using `api.post(...)` above — if only endpoint-specific
methods exist (like `searchMessages`, `updateSettings`), add a small
`post<T>(path: string, body?: unknown)` method there following the same
pattern as the existing `get`/`post` helpers backing those methods, rather
than introducing a one-off fetch call in the test.

- [ ] **Step 5: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass, including the new reindex test (skipped unless
`ELASTIC_URL` is set — it is, in this repo's gitignored `.env.test`).

```bash
git add src/main/lib/db/queries.ts src/main/lib/server/routes/settings.ts tests/api/search-elasticsearch-reindex.spec.ts tests/fixtures/api-client.ts
git commit -m "feat(search): add Elasticsearch test-connection and reindex routes"
```

---

### Task 7: Settings UI — "Search" tab

**Files:**

- Modify: `src/renderer/components/settings/settings-menu.ts`
- Create: `src/renderer/components/settings/settings-form/search.tsx`
- Modify: `src/renderer/components/settings/settings-form.tsx`
- Modify: `src/shared/constants/test-ids.ts`
- Test: `tests/e2e/settings-search.spec.ts`

**Interfaces:**

- Consumes: `search.elasticsearch.{url,username,password,indexName}` form
  fields (from Task 1's `SettingsSchema`); `POST
/api/settings/search/test-connection` and `POST
/api/settings/search/reindex` (Task 6).
- Produces: `TEST_IDS.search.testConnectionButton`,
  `TEST_IDS.search.reindexButton`.

- [ ] **Step 1: Add the nav entry**

In `src/renderer/components/settings/settings-menu.ts`, add `SearchIcon`
to the `lucide-react` import, add `Search = 'Search'` to `SettingsLabel`
(alongside `GraphRag`), and add a nav item — place it as a peer to
`GraphRag`/`McpServers` (around line 93-96):

```ts
    {
      icon: SearchIcon,
      title: SettingsLabel.Search
    },
    {
      icon: NetworkIcon,
      title: SettingsLabel.GraphRag
    },
```

- [ ] **Step 2: Add `TEST_IDS` entries**

In `src/shared/constants/test-ids.ts`, add a new top-level key (alongside
`schedule`):

```ts
  search: {
    testConnectionButton: 'search.test-connection-button',
    reindexButton: 'search.reindex-button'
  }
```

- [ ] **Step 3: Build the Search settings form**

Create `src/renderer/components/settings/settings-form/search.tsx`:

```tsx
import { fetcher } from '@shared/utils/http'
import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function Search({ form }: { form: UseFormReturnType }) {
  const [isTesting, setIsTesting] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await fetcher('/api/settings/search/test-connection', {
        method: 'POST'
      })
      toast.success('Connected to Elasticsearch')
    } catch {
      toast.error('Failed to connect to Elasticsearch')
    } finally {
      setIsTesting(false)
    }
  }

  const handleReindex = async () => {
    setIsReindexing(true)
    try {
      const result = await fetcher<{ count: number }>(
        '/api/settings/search/reindex',
        { method: 'POST' }
      )
      toast.success(`Reindexed ${result.count} messages`)
    } catch {
      toast.error('Failed to reindex messages')
    } finally {
      setIsReindexing(false)
    }
  }

  return (
    <SettingsSection>
      <Controller
        control={form.control}
        name="search.elasticsearch.url"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Elasticsearch URL"
            description="Leave empty to use the built-in PGlite full-text search."
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              placeholder="https://localhost:9200"
              {...field}
              value={field.value ?? ''}
            />
          </SettingsRow>
        )}
      />

      <Controller
        control={form.control}
        name="search.elasticsearch.username"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Username"
            description="Optional — required only if your cluster has security enabled."
            error={fieldState.error}
            layout="vertical"
          >
            <Input {...field} value={field.value ?? ''} />
          </SettingsRow>
        )}
      />

      <Controller
        control={form.control}
        name="search.elasticsearch.password"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Password"
            description="Optional — required only if your cluster has security enabled."
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...field}
              value={field.value ?? ''}
            />
          </SettingsRow>
        )}
      />

      <Controller
        control={form.control}
        name="search.elasticsearch.indexName"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Index Name"
            description='Defaults to "exodus-messages" if left empty.'
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              placeholder="exodus-messages"
              {...field}
              value={field.value ?? ''}
            />
          </SettingsRow>
        )}
      />

      <SettingsRow
        label="Connection"
        description="Test connectivity, or reindex all existing chat history into Elasticsearch."
        layout="vertical"
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isTesting}
            onClick={handleTestConnection}
            data-testid={TEST_IDS.search.testConnectionButton}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isReindexing}
            onClick={handleReindex}
            data-testid={TEST_IDS.search.reindexButton}
          >
            {isReindexing ? 'Reindexing...' : 'Reindex History'}
          </Button>
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
```

(`fetcher<T>(url, options)` is defined in `src/shared/utils/http.ts:65` with
an `HttpFetchOptions` shape of `{ method, headers, body, query, timeout,
responseType }`, all optional — `{ method: 'POST' }` alone is a valid call
with no body, matching the usage above.)

- [ ] **Step 4: Wire the tab into settings-form.tsx**

In `src/renderer/components/settings/settings-form.tsx`, add the import
(alongside `GraphRAG`):

```ts
import { Search } from './settings-form/search'
```

Add the render block (alongside the `GraphRag` block, around line 149):

```tsx
{
  activeTitle === SettingsLabel.Search && <Search form={form} />
}
```

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Write the Playwright e2e test**

This repo's real Electron e2e fixture is `electronTest` (from
`tests/fixtures/electron.ts`), exposing a `mainWindow` `Page` from a
launched build — not a generic `page` fixture. Settings opens via the
`Mod+,` shortcut (`src/renderer/hooks/use-keyboard-shortcuts.ts`) onto a
sidebar of tab buttons rendering their `title` text directly
(`src/renderer/components/settings/settings-sidebar.tsx` —
`<SidebarMenuButton>{item.title}</SidebarMenuButton>`). Whether
`SettingsRow`'s `FieldLabel` is programmatically associated with its input
(for `getByLabel`) isn't established in this codebase, so — mirroring
`tests/e2e/settings-e2e.spec.ts`'s existing "color tone can be changed"
test, which configures settings via a direct `fetch()` inside
`mainWindow.evaluate()` rather than driving form inputs — this test
configures Elasticsearch the same way, then uses real UI interaction only
for the parts that need it: opening Settings, selecting the Search tab,
and clicking the test-id'd button.

Create `tests/e2e/settings-search.spec.ts`:

```ts
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Search', () => {
  test.skip(
    !process.env.ELASTIC_URL,
    'requires ELASTIC_URL env var to test a real Elasticsearch connection'
  )

  test('test connection button reports success against a configured cluster', async ({
    mainWindow
  }) => {
    await mainWindow.evaluate(
      async ({ url, username, password }) => {
        await fetch('http://localhost:60223/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'global',
            search: { elasticsearch: { url, username, password } }
          })
        })
      },
      {
        url: process.env.ELASTIC_URL,
        username: process.env.ELASTIC_USERNAME ?? '',
        password: process.env.ELASTIC_PASSWORD ?? ''
      }
    )

    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Search', exact: true })
      .click()

    await mainWindow.getByTestId('search.test-connection-button').click()
    await expect(
      mainWindow.getByText('Connected to Elasticsearch')
    ).toBeVisible({ timeout: 10_000 })

    // Restore — leave Elasticsearch unconfigured for other tests/dev use.
    await mainWindow.evaluate(async () => {
      await fetch('http://localhost:60223/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'global',
          search: { elasticsearch: { url: '' } }
        })
      })
    })
  })
})
```

- [ ] **Step 7: Manual smoke test**

Run: `pnpm dev`. Open Settings → Search. Confirm the tab renders, fields
save (check via reopening Settings that values persist), and — if you have
a local Elasticsearch reachable — Test Connection and Reindex both report
success toasts.

- [ ] **Step 8: Run the full test suite and commit**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass, including `test-ids.linkage.test.ts` (verifies the two
new `TEST_IDS` entries are both applied in `search.tsx` and referenced by
`tests/e2e/settings-search.spec.ts`).

```bash
git add src/renderer/components/settings/settings-menu.ts src/renderer/components/settings/settings-form/search.tsx src/renderer/components/settings/settings-form.tsx src/shared/constants/test-ids.ts tests/e2e/settings-search.spec.ts
git commit -m "feat(search): add Search settings tab with test-connection and reindex actions"
```
