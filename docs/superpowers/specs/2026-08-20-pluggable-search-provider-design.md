# Pluggable Search Provider (Elasticsearch) — Design

## Context

Exodus is rethinking which "heavy" infrastructure pillars (full-text search,
GraphRAG-style retrieval, observability, computer-use sandboxes) should stay
embedded in the local-first Electron app versus become optional, externally
hosted upgrades. Backend relocation and multi-tenant auth are explicitly
**out of scope** for this effort — Exodus stays a single-user, no-auth,
locally-run app. GraphRAG is also out of scope for this spec; it needs
further research (which framework/graph DB) before a design is written.

This spec covers the first concrete pillar: **full-text search over chat
history**, made pluggable so a self-hosted or cloud Elasticsearch cluster can
be used in place of PGlite's built-in full-text search, while PGlite remains
the always-available default with zero configuration.

**Problem with the status quo:** Exodus's current full-text search (GIN
index on `to_tsvector('simple', content)` in `src/main/lib/db/schema.ts`)
uses Postgres's `simple` text-search configuration, which does not segment
CJK text (no analog to a `jieba`/`ik` analyzer). Chinese-language chat
history is effectively unsearchable. PGlite cannot easily embed a CJK
segmenter. Elasticsearch, with an appropriate analyzer, can — but only as an
external process (there is no embedded/in-process mode for Elasticsearch),
so it must be opt-in and configured by the user (self-hosted via Docker, or
a cloud cluster), never a hard dependency.

## Goals

- A `SearchProvider` abstraction with two implementations: the existing
  PGlite full-text search (default, zero-config) and Elasticsearch
  (optional, user-configured).
- PGlite indexing remains unconditional and authoritative — Elasticsearch is
  a pure additive upgrade to the query path, never a replacement the app
  depends on to function.
- Any Elasticsearch failure (unreachable, misconfigured, auth error) at
  query time falls back to the PGlite result for that request. Search never
  goes fully dark because a self-hosted cluster isn't running.
- Only content actually shown in the chat bubble is indexed: `text` blocks
  from `user`/`assistant` messages. AI `thinking` blocks and `toolResult`
  messages (web search payloads, terminal output, artifacts, deep research,
  etc.) are excluded from both providers, tightening today's over-broad
  index as a side effect.
- No changes to the existing `/api/chat/search` contract or
  `search-dialog.tsx` — the frontend is provider-agnostic.

## Non-Goals

- GraphRAG / retrieval-provider abstraction (separate future spec).
- Backend relocation, multi-tenant auth, hosting Exodus's Hono server
  centrally.
- Indexing the knowledge base (`knowledge_doc`) — this spec covers chat
  message search only, matching the existing `search-dialog.tsx` feature.
- A background job/queue system for reindexing (see Reindex section) —
  Exodus is single-user/local scale, not a fleet.

## Architecture

### 1. Searchable text extraction (shared by both providers)

A new pure function, `extractSearchableText(message: Message): string | null`
in `src/main/lib/search/extract-searchable-text.ts`:

- `role === 'toolResult'` → always `null` (excluded from search entirely).
- `role === 'user' | 'assistant'` → join all `type: 'text'` blocks in
  `content` with `\n`; blocks of type `thinking`, `toolCall`, `image` etc.
  are skipped. Empty result → `null`.

This mirrors the extraction `search-dialog.tsx` already does client-side for
display (`content.find(c => c.type === 'text' ...)`), now centralized and
used to populate a stored column instead of being recomputed per render.

### 2. Schema change

Add `message.searchText: text (nullable)` to `src/main/lib/db/schema.ts`.
Replace the GIN index expression:

```ts
// before
index('message_search_index').using(
  'gin',
  sql`to_tsvector('simple', ${table.content})`
)

// after
index('message_search_index').using(
  'gin',
  sql`to_tsvector('simple', ${table.searchText})`
)
```

Migration (via `pnpm db:generate`): add the column, backfill existing rows
using `extractSearchableText`, then swap the index expression. Backfill runs
once, in the migration itself (not a runtime job) — existing chat history is
finite and this is a one-time cost.

### 3. `SearchProvider` abstraction

New directory `src/main/lib/search/` (parallel to `src/main/lib/ai/`):

```ts
// src/main/lib/search/types.ts
export interface SearchHit {
  id: string
  chatId: string
  title: string
  content: Message['content']
  createdAt: Date
}

export interface SearchProvider {
  indexMessage(message: Message): Promise<void>
  deleteByChatId(chatId: string): Promise<void>
  search(query: string): Promise<SearchHit[]>
}
```

- `src/main/lib/search/providers/pglite-search.ts` — today's
  `fullTextSearchOnMessages` query (now against `searchText` instead of
  `content`), wrapped to satisfy `SearchProvider`. `indexMessage` is a no-op
  (PGlite indexing happens at the DB-write layer via the `searchText`
  column, described below — the PGlite provider only serves queries).
- `src/main/lib/search/providers/elasticsearch-search.ts` — uses
  `@elastic/elasticsearch`. One index (default name `exodus-messages`,
  configurable), documents keyed by message `id`, fields
  `{ chatId, searchText, createdAt }`. `search()` returns hits mapped to
  `SearchHit`, joining chat title the same way `fullTextSearchOnMessages`
  does today (`getChatById` per hit).
- `src/main/lib/search/resolve-search-provider.ts` —
  `resolveSearchProvider(settings): { primary: SearchProvider; fallback: SearchProvider }`.
  If `settings.search?.elasticsearch?.url` is a non-empty string, `primary`
  is the Elasticsearch provider and `fallback` is the PGlite provider.
  Otherwise `primary` is the PGlite provider and there is no fallback
  needed (it _is_ the baseline).

### 4. Always-on baseline, optional upgrade

- **Index-time:** `saveMessages()` in `src/main/lib/db/queries.ts` computes
  `searchText` via `extractSearchableText` for each message before insert
  (unconditional — this is what keeps the PGlite GIN index authoritative
  regardless of Elasticsearch config). After the insert succeeds, if
  Elasticsearch is configured, fire-and-forget
  `elasticsearchProvider.indexMessage(message).catch(err => logError(...))`
  — matching the existing fire-and-forget pattern in
  `src/main/lib/ai/calling-tools/create-artifact.ts`
  (`saveArtifact(...).catch(() => {})`). A failed Elasticsearch write never
  fails the chat request; the message is already durable and searchable via
  PGlite.
- **Query-time:** the search route resolves `{ primary, fallback }`. If
  `primary` is Elasticsearch, call it in a `try/catch`; on any error, log
  and call `fallback.search(query)` (PGlite) instead, returning that result
  to the client transparently — no error surfaced to the UI for this case.
  If `primary` is already PGlite, call it directly.
- **Chat deletion:** wherever chat deletion currently removes rows from
  `message` (existing chat-deletion query in
  `src/main/lib/db/queries.ts`), also call
  `resolveSearchProvider(settings).primary.deleteByChatId(chatId)` (and, if
  Elasticsearch is configured, the fallback's `deleteByChatId` is a no-op
  since PGlite deletion already cascades via the SQL delete — only the
  Elasticsearch side needs an explicit call to avoid orphaned documents).

### 5. Settings

`src/shared/schemas/settings-schema.ts` — new schema, following the
`WebSearchSchema` pattern:

```ts
export const ElasticsearchSchema = z.object({
  url: z.string().nullish(),
  username: z.string().nullish(),
  password: z.string().nullish(),
  indexName: z.string().nullish() // defaults to 'exodus-messages' if unset
})

export const SearchSchema = z.object({
  elasticsearch: ElasticsearchSchema.nullish()
})
```

`src/main/lib/db/schema.ts` — new column on `settings`:

```ts
search: jsonb('search').$type<z.infer<typeof SearchSchema>>()
```

A non-empty `url` is what enables Elasticsearch — no separate boolean
toggle, matching how `braveApiKey` presence enables web search today.

### 6. Settings UI — new "Search" tab

The settings nav (`src/renderer/components/settings/settings-menu.ts`)
already dedicates one top-level entry per subsystem (`GraphRag`,
`McpServers`, `MemoryLayer`, etc. — `GraphRag` currently renders
`<UnderConstruction />`). Add a new top-level entry:

```ts
// settings-menu.ts
SettingsLabel.Search = 'Search'
// menus.navMain: add { icon: SearchIcon, title: SettingsLabel.Search }
```

New `src/renderer/components/settings/settings-form/search.tsx`: URL,
username, password, index name fields (following the existing form-field
patterns in `web-search.tsx`), a "Test connection" action (calls a new
lightweight ping endpoint, see below), and a "Reindex history" action (see
below). Wired into `settings-form.tsx`'s
`{activeTitle === SettingsLabel.Search && <Search />}` block, same as every
other tab.

### 7. Backfill / reindex

PGlite never needs backfill after the initial migration. Elasticsearch
starts empty the first time a user configures it. The "Reindex history"
button calls a new route (`POST /api/settings/search/reindex`) that:

1. Reads all `message` rows with non-null `searchText`.
2. Bulk-indexes them via `client.helpers.bulk` from `@elastic/elasticsearch`.
3. Returns a count on completion.

This runs synchronously within the request (single local user, bounded
history size — not a fleet-scale reindex problem). The UI shows a loading
state on the button and a toast with the resulting count. No background
job/queue/SSE progress system (unlike Deep Research) — that complexity
isn't warranted at this scale.

### 8. Query route

`src/main/lib/server/routes/chat.ts`'s existing `/search` handler changes
from calling `fullTextSearchOnMessages(query)` directly to:

```ts
const { primary, fallback } = resolveSearchProvider(settings)
try {
  return c.json(await primary.search(query))
} catch (err) {
  logError('Search provider failed, falling back to PGlite', err)
  return c.json(await fallback.search(query))
}
```

(When `primary` is already the PGlite provider, `fallback` is undefined and
the `catch` simply rethrows — no double-query.)

`search-dialog.tsx` and its SWR call to `/api/chat/search?query=...` are
unchanged — same request/response shape.

## Testing

- **Unit (Vitest):** `extractSearchableText()` — thinking blocks excluded,
  toolResult rows return `null`, multiple text blocks joined, empty content
  returns `null`. `resolveSearchProvider()` — no config → PGlite only;
  Elasticsearch configured → correct primary/fallback pairing.
  Query-fallback logic — mock the Elasticsearch client to throw, assert the
  PGlite provider's result is returned.
- **Integration (Playwright, `tests/api/`):** gated on
  `process.env.ELASTIC_URL`, mirroring the existing
  `!process.env.OPENAI_API_KEY` skip pattern in `tests/e2e/chat-e2e.spec.ts`
  and `tests/e2e/chat-management.spec.ts`. Writes `ELASTIC_URL` /
  `ELASTIC_USERNAME` / `ELASTIC_PASSWORD` (already present in the
  gitignored `.env.test`) into settings via the real settings API,
  following the pattern in `tests/api/settings.spec.ts`, then indexes a
  message and asserts it's found via `/api/chat/search`. Not CI-blocking —
  runs locally against a developer's Docker Elasticsearch instance.

## Open Items Deferred

- GraphRAG retrieval provider — separate spec once a framework/graph-DB
  choice is made.
- Whether to eventually apply the same `SearchProvider`-style abstraction to
  `knowledge_doc` (RAG) search — out of scope here; today's RAG path is
  untouched by this spec.
