# Home Discover Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Discover" news module to the home page that turns the user's own Memory entries into a daily, cached, personalized feed via Brave News Search — grouped rows by memory topic, refreshed roughly once a day (never on every page load) plus manual refresh.

**Architecture:** A background job (`discover-refresh`, pgmq-backed like the existing queues) reads active memories, makes one LLM call to turn newsworthy ones into search queries (dropping non-newsworthy ones), fans those queries out to Brave's News Search endpoint, and caches the whole result as one JSON row. The home page only ever reads that cache. `Home`/`Chat`/`Messages` get an explicit `showDiscover` boolean threaded through them so the feed renders on the true home route only — never on an existing chat, never on "new chat inside a Project."

**Tech Stack:** Electron main (Node), Hono routes, Drizzle ORM + PGlite, pgmq job queue, Zod settings schemas, `@mariozechner/pi-ai` (`completeSimple`), Brave Search API, React 19 + RHF + Tailwind v4 renderer, Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-05-home-discover-feed-design.md`

## Global Constraints

- **Off by default.** `discover.enabled` defaults `false`. Zero behavior
  change anywhere until the user opts in from Settings.
- **Never call Brave or an LLM on a page load.** All fetching happens inside
  the background job; the home page and Settings only ever read the cached
  `discover_feed` row.
- **A failed refresh never blanks a working feed.** On error, `groups` and
  `generatedAt` are left untouched; only `status`/`error` change.
- **Reuse the existing Brave key** (`settings.webSearch.braveApiKey`) and
  locale fields (`settings.webSearch.country`/`languages`). No separate key or
  locale settings for Discover.
- **`showDiscover` is explicit, not inferred.** Never derive "is this the home
  page" from `messages.length === 0` alone — `Messages` is shared with
  `ChatDetail` and with "new chat inside a Project."
- **No data migration.** One squashed Drizzle migration (`0000_*`), regenerated
  from scratch on schema change; a DB wipe is assumed (established workflow in
  this repo).
- Run `pnpm format && pnpm lint && npm run typecheck && pnpm test` before every
  commit; all must pass. `npx electron-vite build` before the final commit.

---

## Task 1: Shared types, settings schema, DB schema, migration

**Files:**

- Create: `src/shared/types/discover.ts`
- Modify: `src/shared/schemas/settings-schema.ts` (add `DiscoverSchema`, add `discover` to `SettingsSchema`)
- Modify: `src/main/lib/db/schema.ts` (import `DiscoverSchema` + the new shared type; add `discoverFeed` table + `discoverFeedStatusEnum`; add `settings.discover` column)
- Modify: `resources/drizzle/*` (regenerate)
- Test: `tests/unit/main/lib/db/schema-discover.test.ts` (create)

**Interfaces:**

- Produces:
  - `DiscoverArticle`, `DiscoverGroup`, `DiscoverFeedDto` (`src/shared/types/discover.ts`) — see Step 1.
  - `DiscoverSchema` — Zod object `{ enabled: boolean (default false), topicCount?: number, articlesPerTopic?: number }`.
  - `settings.discover` jsonb column, typed `z.infer<typeof DiscoverSchema>`.
  - `discoverFeed` table: `id: text (PK, always 'global')`, `groups: jsonb DiscoverGroup[]`, `generatedAt: timestamp | null`, `status: 'idle'|'refreshing'|'failed'`, `error: text | null`.
  - `DiscoverFeedRow` type (`InferSelectModel<typeof discoverFeed>`).

- [ ] **Step 1: Write the shared types**

`src/shared/types/discover.ts`:

```ts
export interface DiscoverArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  age?: string
}

export interface DiscoverGroup {
  memoryId: string
  topic: string
  query: string
  articles: DiscoverArticle[]
}

export interface DiscoverFeedDto {
  groups: DiscoverGroup[]
  generatedAt: string | null
  status: 'idle' | 'refreshing' | 'failed'
}
```

- [ ] **Step 2: Add `DiscoverSchema` to `settings-schema.ts`**

Insert after `KnowledgeBaseSchema` (near line 104, before `ImageSchema`):

```ts
export const DiscoverSchema = z.object({
  enabled: z.boolean().default(false),
  topicCount: formNumber(z.number().gte(1).lte(8)).nullish(), // default 4
  articlesPerTopic: formNumber(z.number().gte(1).lte(5)).nullish() // default 3
})
```

In `SettingsSchema` (near line 212, after `knowledgeBase: KnowledgeBaseSchema.nullish(),`):

```ts
  discover: DiscoverSchema.nullish(),
```

- [ ] **Step 3: Update `db/schema.ts`**

In the `@shared/schemas/settings-schema` import block, add `DiscoverSchema,`
(after `DeepResearchSchema,`, before `GoogleCloudSchema,`).

Add the shared-type import near the top, with the other `@shared/types` import:

```ts
import type { DiscoverGroup } from '@shared/types/discover'
```

In the `settings` pgTable (after `knowledgeBase: jsonb('knowledgeBase')...`, near
line 153):

```ts
  discover: jsonb('discover').$type<z.infer<typeof DiscoverSchema>>(),
```

Add a new section near the bottom of the file (after the Knowledge Base
section is a reasonable spot, or any top-level spot — it has no FK
dependencies on anything):

```ts
// ─── Discover ────────────────────────────────────────────────────────────────
// A single cached feed, regenerated wholesale by the discover-refresh job.
// No relational columns / no FK to `memory` — the whole cache is replaced
// atomically on every refresh, so a stale memoryId inside old JSON is
// harmless and never queried against the memory table.

export const discoverFeedStatusEnum = pgEnum('discover_feed_status', [
  'idle',
  'refreshing',
  'failed'
])

export const discoverFeed = pgTable('discover_feed', {
  id: text('id').primaryKey(), // always 'global'
  groups: jsonb('groups')
    .$type<DiscoverGroup[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  generatedAt: timestamp('generatedAt'),
  status: discoverFeedStatusEnum('status').notNull().default('idle'),
  error: text('error')
})

export type DiscoverFeedRow = InferSelectModel<typeof discoverFeed>
```

- [ ] **Step 4: Write the schema test**

```ts
// tests/unit/main/lib/db/schema-discover.test.ts
import { discoverFeed, settings } from '@main/lib/db/schema'
import { describe, expect, it } from 'vitest'

describe('discover schema', () => {
  it('discoverFeed has the cache columns', () => {
    expect(Object.keys(discoverFeed)).toEqual(
      expect.arrayContaining(['id', 'groups', 'generatedAt', 'status', 'error'])
    )
  })

  it('settings has a discover column', () => {
    expect(Object.keys(settings)).toContain('discover')
  })
})
```

- [ ] **Step 5: Run the test — expect PASS**

Run: `pnpm test schema-discover`
Expected: PASS (2 tests).

- [ ] **Step 6: Regenerate the migration**

```bash
rm resources/drizzle/0000_*.sql resources/drizzle/meta/0000_snapshot.json
printf '{\n  "version": "7",\n  "dialect": "postgresql",\n  "entries": []\n}' \
  > resources/drizzle/meta/_journal.json
pnpm db:generate
```

- [ ] **Step 7: Verify the generated SQL**

Run: `grep -E '"discover"|discover_feed_status|CREATE TABLE "discover_feed"' resources/drizzle/0000_*.sql`
Expected: `"discover" jsonb` on the settings table; the `discover_feed_status`
enum type; a `discover_feed` table with `groups`/`generatedAt`/`status`/`error`.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/shared/types/discover.ts src/shared/schemas/settings-schema.ts \
  src/main/lib/db/schema.ts resources/drizzle \
  tests/unit/main/lib/db/schema-discover.test.ts
git commit -m "feat(discover): settings + discover_feed schema"
```

---

## Task 2: `discover-queries.ts`

**Files:**

- Create: `src/main/lib/db/discover-queries.ts`
- Test: `tests/unit/main/lib/db/discover-queries.test.ts` (create)

**Interfaces:**

- Consumes: `discoverFeed`, `DiscoverFeedRow` (Task 1).
- Produces:
  - `getDiscoverFeed(): Promise<DiscoverFeedRow>` — ensures the singleton row
    exists (insert-if-missing), then returns it.
  - `setDiscoverFeed(patch: Partial<{ groups: DiscoverGroup[]; generatedAt: Date | null; status: 'idle'|'refreshing'|'failed'; error: string | null }>): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/main/lib/db/discover-queries.test.ts
import { describe, expect, it, vi } from 'vitest'

const calls: Record<string, unknown[]> = { set: [], insertValues: [] }

vi.mock('@main/lib/db/db', () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        calls.insertValues.push(v)
        return { onConflictDoNothing: async () => undefined }
      }
    }),
    select: () => ({
      from: () => ({
        where: async () => [
          {
            id: 'global',
            groups: [],
            generatedAt: null,
            status: 'idle',
            error: null
          }
        ]
      })
    }),
    update: () => ({
      set: (s: unknown) => {
        calls.set.push(s)
        return { where: async () => undefined }
      }
    })
  }
}))

const q = await import('@main/lib/db/discover-queries')

describe('discover-queries', () => {
  it('getDiscoverFeed ensures the row exists and returns it', async () => {
    const row = await q.getDiscoverFeed()
    expect(row.id).toBe('global')
    expect(calls.insertValues[0]).toEqual({ id: 'global' })
  })

  it('setDiscoverFeed writes the patch', async () => {
    calls.set.length = 0
    await q.setDiscoverFeed({ status: 'refreshing' })
    expect(calls.set[0]).toEqual({ status: 'refreshing' })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test discover-queries`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `discover-queries.ts`**

```ts
// src/main/lib/db/discover-queries.ts
import type { DiscoverGroup } from '@shared/types/discover'
import { eq } from 'drizzle-orm'

import { db } from './db'
import { discoverFeed, type DiscoverFeedRow } from './schema'

const FEED_ID = 'global'

export async function getDiscoverFeed(): Promise<DiscoverFeedRow> {
  await db.insert(discoverFeed).values({ id: FEED_ID }).onConflictDoNothing()
  const [row] = await db
    .select()
    .from(discoverFeed)
    .where(eq(discoverFeed.id, FEED_ID))
  return row!
}

type DiscoverFeedPatch = Partial<{
  groups: DiscoverGroup[]
  generatedAt: Date | null
  status: 'idle' | 'refreshing' | 'failed'
  error: string | null
}>

export async function setDiscoverFeed(patch: DiscoverFeedPatch): Promise<void> {
  await getDiscoverFeed()
  await db.update(discoverFeed).set(patch).where(eq(discoverFeed.id, FEED_ID))
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test discover-queries`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/db/discover-queries.ts tests/unit/main/lib/db/discover-queries.test.ts
git commit -m "feat(discover): discover-queries singleton cache row"
```

---

## Task 3: Brave News client

**Files:**

- Create: `src/main/lib/discover/brave-news-client.ts`
- Test: `tests/unit/main/lib/discover/brave-news-client.test.ts` (create)

**Interfaces:**

- Produces:
  - `interface BraveNewsArticle { title, url, description, source, favicon?, thumbnail?, age? }`
  - `searchBraveNews(apiKey: string, query: string, opts: { count: number; country?: string | null; language?: string | null }): Promise<BraveNewsArticle[]>`
    — throws on a non-2xx/network failure; a malformed individual result
    (missing `title`/`url`) is skipped, not fatal.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/main/lib/discover/brave-news-client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { searchBraveNews } from '@main/lib/discover/brave-news-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
afterEach(() => fetchMock.mockReset())

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('searchBraveNews', () => {
  it('sends the query, count, freshness, and auth header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))
    await searchBraveNews('k', 'SoftBank 9984', {
      count: 3,
      country: 'US',
      language: 'en'
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('q=SoftBank')
    expect(String(url)).toContain('count=3')
    expect(String(url)).toContain('freshness=pd')
    expect(String(url)).toContain('country=us')
    expect(String(url)).toContain('search_lang=en')
    expect(init.headers['x-subscription-token']).toBe('k')
  })

  it('maps results, preferring source over meta_url.hostname', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'Article A',
            url: 'https://example.com/a',
            description: 'desc',
            source: 'Example News',
            age: '2h',
            thumbnail: { src: 'https://img/a.jpg' },
            meta_url: { hostname: 'example.com', favicon: 'https://img/f.ico' }
          }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res).toEqual([
      {
        title: 'Article A',
        url: 'https://example.com/a',
        description: 'desc',
        source: 'Example News',
        favicon: 'https://img/f.ico',
        thumbnail: 'https://img/a.jpg',
        age: '2h'
      }
    ])
  })

  it('falls back to meta_url.hostname when source is missing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: 'B',
            url: 'https://foo.example/b',
            meta_url: { hostname: 'foo.example' }
          }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res[0].source).toBe('foo.example')
  })

  it('skips a malformed result instead of failing the whole batch', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          { description: 'no title or url' },
          { title: 'ok', url: 'https://x/y' }
        ]
      })
    )
    const res = await searchBraveNews('k', 'q', { count: 3 })
    expect(res).toHaveLength(1)
    expect(res[0].title).toBe('ok')
  })

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401))
    await expect(searchBraveNews('bad', 'q', { count: 3 })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test brave-news-client`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `brave-news-client.ts`**

```ts
// src/main/lib/discover/brave-news-client.ts
const BRAVE_NEWS_URL = 'https://api.search.brave.com/res/v1/news/search'

export interface BraveNewsArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  age?: string
}

interface BraveNewsRawResult {
  title?: string
  url?: string
  description?: string
  source?: string
  age?: string
  thumbnail?: { src?: string }
  meta_url?: { hostname?: string; favicon?: string }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export async function searchBraveNews(
  apiKey: string,
  query: string,
  opts: { count: number; country?: string | null; language?: string | null }
): Promise<BraveNewsArticle[]> {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('count', String(Math.min(Math.max(opts.count, 1), 20)))
  params.set('freshness', 'pd')
  if (opts.country) params.set('country', opts.country.toLowerCase())
  if (opts.language) params.set('search_lang', opts.language)

  const res = await fetch(`${BRAVE_NEWS_URL}?${params.toString()}`, {
    headers: { accept: 'application/json', 'x-subscription-token': apiKey }
  })
  if (!res.ok) {
    throw new Error(`Brave News search failed: ${res.status}`)
  }
  const body = (await res.json()) as { results?: BraveNewsRawResult[] }

  const articles: BraveNewsArticle[] = []
  for (const r of body.results ?? []) {
    if (!r.title || !r.url) continue
    articles.push({
      title: r.title,
      url: r.url,
      description: r.description ?? '',
      source: r.source ?? r.meta_url?.hostname ?? safeHostname(r.url),
      favicon: r.meta_url?.favicon,
      thumbnail: r.thumbnail?.src,
      age: r.age
    })
  }
  return articles
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test brave-news-client`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/discover/brave-news-client.ts \
  tests/unit/main/lib/discover/brave-news-client.test.ts
git commit -m "feat(discover): Brave News Search client"
```

---

## Task 4: Query generation + `runDiscoverRefresh`

**Files:**

- Create: `src/main/lib/discover/manager.ts`
- Test: `tests/unit/main/lib/discover/manager.test.ts` (create)

**Interfaces:**

- Consumes: `getSettings` (`@main/lib/db/queries`), `getActiveMemories`,
  `LOCAL_USER_ID` (`@main/lib/ai/memory/manager`), `getModelFromProvider`
  (`@main/lib/ai/utils/model-util`), `extractTextFromCompletion` /
  `parseJsonFromLlmResponse` (`@main/lib/ai/utils/llm-response-util`),
  `getDiscoverFeed` / `setDiscoverFeed` (Task 2), `searchBraveNews` (Task 3),
  `completeSimple` (`@mariozechner/pi-ai`).
- Produces: `runDiscoverRefresh(opts?: { force?: boolean }): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/main/lib/discover/manager.test.ts
import type { Model } from '@mariozechner/pi-ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/db/db', () => ({ db: {}, pglite: {} }))
vi.mock('@main/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}))

const mockGetSettings = vi.fn()
vi.mock('@main/lib/db/queries', () => ({ getSettings: mockGetSettings }))

const mockGetActiveMemories = vi.fn()
vi.mock('@main/lib/db/memory-queries', () => ({
  getActiveMemories: mockGetActiveMemories
}))

const mockGetDiscoverFeed = vi.fn()
const mockSetDiscoverFeed = vi.fn()
vi.mock('@main/lib/db/discover-queries', () => ({
  getDiscoverFeed: mockGetDiscoverFeed,
  setDiscoverFeed: mockSetDiscoverFeed
}))

const mockGetModelFromProvider = vi.fn()
vi.mock('@main/lib/ai/utils/model-util', () => ({
  getModelFromProvider: mockGetModelFromProvider
}))

const mockCompleteSimple = vi.fn()
vi.mock('@mariozechner/pi-ai', () => ({
  completeSimple: (...args: unknown[]) => mockCompleteSimple(...args)
}))

const mockSearchBraveNews = vi.fn()
vi.mock('@main/lib/discover/brave-news-client', () => ({
  searchBraveNews: (...args: unknown[]) => mockSearchBraveNews(...args)
}))

const { runDiscoverRefresh } = await import('@main/lib/discover/manager')

const model = { id: 'm' } as unknown as Model<string>

function llmReturns(obj: unknown) {
  mockCompleteSimple.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(obj) }]
  })
}

function memoryRow(over: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    key: 'SoftBank',
    summary: 'Holds SoftBank 9984',
    lastUsedAt: new Date('2026-09-05'),
    updatedAt: new Date('2026-09-05'),
    ...over
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSettings.mockResolvedValue({
    id: 'global',
    discover: { enabled: true, topicCount: 4, articlesPerTopic: 3 },
    webSearch: { braveApiKey: 'brave-key', country: 'us', languages: ['en'] }
  })
  mockGetDiscoverFeed.mockResolvedValue({
    id: 'global',
    groups: [],
    generatedAt: null,
    status: 'idle',
    error: null
  })
  mockGetModelFromProvider.mockReturnValue({ chatModel: model, apiKey: 'k' })
  mockGetActiveMemories.mockResolvedValue([])
  mockSearchBraveNews.mockResolvedValue([])
})

describe('runDiscoverRefresh', () => {
  it('no-ops when discover is disabled', async () => {
    mockGetSettings.mockResolvedValue({
      id: 'global',
      discover: { enabled: false }
    })
    await runDiscoverRefresh()
    expect(mockGetDiscoverFeed).not.toHaveBeenCalled()
  })

  it('no-ops when no Brave key is configured', async () => {
    mockGetSettings.mockResolvedValue({
      id: 'global',
      discover: { enabled: true },
      webSearch: {}
    })
    await runDiscoverRefresh()
    expect(mockGetDiscoverFeed).not.toHaveBeenCalled()
  })

  it('no-ops when the feed is fresh and force is not set', async () => {
    mockGetDiscoverFeed.mockResolvedValue({
      id: 'global',
      groups: [],
      generatedAt: new Date(), // just now
      status: 'idle',
      error: null
    })
    await runDiscoverRefresh()
    expect(mockGetActiveMemories).not.toHaveBeenCalled()
  })

  it('proceeds when force is set even if fresh', async () => {
    mockGetDiscoverFeed.mockResolvedValue({
      id: 'global',
      groups: [],
      generatedAt: new Date(),
      status: 'idle',
      error: null
    })
    mockGetActiveMemories.mockResolvedValue([])
    await runDiscoverRefresh({ force: true })
    expect(mockGetActiveMemories).toHaveBeenCalled()
  })

  it('writes an empty feed when there are no active memories', async () => {
    mockGetActiveMemories.mockResolvedValue([])
    await runDiscoverRefresh()
    expect(mockSetDiscoverFeed).toHaveBeenCalledWith(
      expect.objectContaining({ groups: [], status: 'idle' })
    )
  })

  it('builds groups from surviving (non-null-query) LLM items', async () => {
    mockGetActiveMemories.mockResolvedValue([
      memoryRow({ id: 'mem-1', key: 'SoftBank' }),
      memoryRow({ id: 'mem-2', key: 'Japanese grammar' })
    ])
    llmReturns({
      items: [
        { memoryId: 'mem-1', topic: 'SoftBank', query: 'SoftBank 9984 news' },
        { memoryId: 'mem-2', topic: 'Japanese grammar', query: null }
      ]
    })
    mockSearchBraveNews.mockResolvedValue([
      { title: 'A', url: 'https://x/a', description: '', source: 'x' }
    ])

    await runDiscoverRefresh()

    expect(mockSearchBraveNews).toHaveBeenCalledTimes(1)
    expect(mockSearchBraveNews).toHaveBeenCalledWith(
      'brave-key',
      'SoftBank 9984 news',
      {
        count: 3,
        country: 'us',
        language: 'en'
      }
    )
    const written = mockSetDiscoverFeed.mock.calls.find(
      (c) => c[0].status === 'idle' && c[0].groups
    )?.[0]
    expect(written.groups).toEqual([
      {
        memoryId: 'mem-1',
        topic: 'SoftBank',
        query: 'SoftBank 9984 news',
        articles: [
          { title: 'A', url: 'https://x/a', description: '', source: 'x' }
        ]
      }
    ])
  })

  it('drops a group whose query returned zero articles', async () => {
    mockGetActiveMemories.mockResolvedValue([memoryRow()])
    llmReturns({
      items: [{ memoryId: 'mem-1', topic: 'SoftBank', query: 'q' }]
    })
    mockSearchBraveNews.mockResolvedValue([])

    await runDiscoverRefresh()

    const written = mockSetDiscoverFeed.mock.calls.find(
      (c) => c[0].status === 'idle'
    )?.[0]
    expect(written.groups).toEqual([])
  })

  it('one failed Brave query does not drop other groups', async () => {
    mockGetActiveMemories.mockResolvedValue([
      memoryRow({ id: 'mem-1' }),
      memoryRow({ id: 'mem-2', key: 'Argentina' })
    ])
    llmReturns({
      items: [
        { memoryId: 'mem-1', topic: 'SoftBank', query: 'q1' },
        { memoryId: 'mem-2', topic: 'Argentina', query: 'q2' }
      ]
    })
    mockSearchBraveNews.mockImplementation(async (_key: string, q: string) => {
      if (q === 'q1') throw new Error('rate limited')
      return [{ title: 'B', url: 'https://x/b', description: '', source: 'x' }]
    })

    await runDiscoverRefresh()

    const written = mockSetDiscoverFeed.mock.calls.find(
      (c) => c[0].status === 'idle'
    )?.[0]
    expect(written.groups).toHaveLength(1)
    expect(written.groups[0].memoryId).toBe('mem-2')
  })

  it('on an LLM failure, marks status failed, leaves groups/generatedAt untouched, and rethrows', async () => {
    mockGetActiveMemories.mockResolvedValue([memoryRow()])
    mockCompleteSimple.mockRejectedValue(new Error('provider down'))

    await expect(runDiscoverRefresh()).rejects.toThrow('provider down')

    expect(mockSetDiscoverFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('provider down')
      })
    )
    const failedCall = mockSetDiscoverFeed.mock.calls.find(
      (c) => c[0].status === 'failed'
    )?.[0]
    expect(failedCall.groups).toBeUndefined()
    expect(failedCall.generatedAt).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test discover/manager`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `manager.ts`**

```ts
// src/main/lib/discover/manager.ts
import { completeSimple } from '@mariozechner/pi-ai'
import type { DiscoverGroup } from '@shared/types/discover'
import { z } from 'zod'

import { LOCAL_USER_ID } from '../ai/memory/manager'
import {
  extractTextFromCompletion,
  parseJsonFromLlmResponse
} from '../ai/utils/llm-response-util'
import { getModelFromProvider } from '../ai/utils/model-util'
import { searchBraveNews } from './brave-news-client'
import { getDiscoverFeed, setDiscoverFeed } from '../db/discover-queries'
import { getActiveMemories, type MemoryRow } from '../db/memory-queries'
import { getSettings } from '../db/queries'
import { logger } from '../logger'

const STALE_AFTER_MS = 20 * 60 * 60 * 1000 // ~20h

const DISCOVER_QUERY_SYSTEM = `You turn a user's personal memory entries into news-search queries.

For each memory given, decide:
- If it could plausibly have relevant, genuinely newsworthy developments (a company/stock, a sports team, a public figure, an ongoing situation, a product category) — write ONE concise, high-signal news search query for it, and a short topic label (2-4 words) for display.
- If it's a personal habit, preference, skill practice, or private/local detail with no news angle (e.g. language-study progress, home-network configuration, a personal preference) — set "query" to null.

Return ONLY JSON matching this shape, one entry per memory given, in the same order:
{"items":[{"memoryId":"<id>","topic":"<short label>","query":"<search query>"},{"memoryId":"<id>","topic":"<short label>","query":null}]}`

const discoverQuerySchema = z.object({
  items: z.array(
    z.object({
      memoryId: z.string(),
      topic: z.string().min(1),
      query: z.string().min(1).nullable().optional()
    })
  )
})

function formatMemoryForPrompt(m: MemoryRow): string {
  return `- id: ${m.id}\n  key: ${m.key}\n  summary: ${m.summary}`
}

function recencyMs(m: MemoryRow): number {
  return (m.lastUsedAt ?? m.updatedAt ?? new Date(0)).getTime()
}

export async function runDiscoverRefresh(
  opts: { force?: boolean } = {}
): Promise<void> {
  const settings = await getSettings()
  if (!settings.discover?.enabled) return
  const braveApiKey = settings.webSearch?.braveApiKey
  if (!braveApiKey) return

  const current = await getDiscoverFeed()
  if (!opts.force && current.generatedAt) {
    if (Date.now() - current.generatedAt.getTime() < STALE_AFTER_MS) return
  }

  await setDiscoverFeed({ status: 'refreshing' })

  try {
    const topicCount = settings.discover.topicCount ?? 4
    const articlesPerTopic = settings.discover.articlesPerTopic ?? 3

    const active = await getActiveMemories(LOCAL_USER_ID)
    const candidates = [...active]
      .sort((a, b) => recencyMs(b) - recencyMs(a))
      .slice(0, Math.min(active.length, topicCount + 4))

    if (candidates.length === 0) {
      await setDiscoverFeed({
        groups: [],
        generatedAt: new Date(),
        status: 'idle',
        error: null
      })
      return
    }

    const { chatModel, apiKey } = getModelFromProvider(settings)
    const prompt = `Memories:\n${candidates.map(formatMemoryForPrompt).join('\n')}`
    const result = await completeSimple(
      chatModel,
      {
        systemPrompt: DISCOVER_QUERY_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey }
    )
    const text = extractTextFromCompletion(result.content)
    const parsed = parseJsonFromLlmResponse(text, discoverQuerySchema, {
      items: []
    })

    const kept = parsed.items
      .filter(
        (i): i is { memoryId: string; topic: string; query: string } =>
          typeof i.query === 'string' && i.query.trim().length > 0
      )
      .slice(0, topicCount)

    const settled = await Promise.allSettled(
      kept.map((item) =>
        searchBraveNews(braveApiKey, item.query, {
          count: articlesPerTopic,
          country: settings.webSearch?.country,
          language: settings.webSearch?.languages?.[0]
        })
      )
    )

    const groups: DiscoverGroup[] = []
    kept.forEach((item, idx) => {
      const outcome = settled[idx]
      if (outcome.status !== 'fulfilled') {
        logger.warn('discover', 'Brave News query failed', {
          query: item.query,
          error: String(outcome.reason)
        })
        return
      }
      if (outcome.value.length === 0) return
      groups.push({
        memoryId: item.memoryId,
        topic: item.topic,
        query: item.query,
        articles: outcome.value
      })
    })

    await setDiscoverFeed({
      groups,
      generatedAt: new Date(),
      status: 'idle',
      error: null
    })
  } catch (error) {
    await setDiscoverFeed({ status: 'failed', error: String(error) })
    throw error
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test discover/manager`
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck + full unit suite**

Run: `npm run typecheck && pnpm test`
Expected: PASS. (`kb-tools.ts` or other in-flight failures should not exist at
this point in the branch — if `npm run typecheck` reports anything outside
files this task touches, stop and investigate before continuing.)

- [ ] **Step 6: Commit**

```bash
git add src/main/lib/discover/manager.ts tests/unit/main/lib/discover/manager.test.ts
git commit -m "feat(discover): memory-driven query generation + runDiscoverRefresh"
```

---

## Task 5: Job queue integration

**Files:**

- Modify: `src/main/lib/jobs/types.ts` (add `'discover-refresh'` queue)
- Modify: `src/main/lib/jobs/handlers.ts` (add the handler)
- Modify: `src/main/lib/jobs/worker.ts` (periodic enqueue)
- Modify: `tests/unit/main/lib/jobs/handlers.test.ts`
- Modify: `tests/unit/main/lib/jobs/worker.test.ts`, `tests/unit/main/lib/jobs/queries.integration.test.ts` (handler mock map gains `'discover-refresh'`)

**Interfaces:**

- Consumes: `runDiscoverRefresh` (Task 4).
- Produces: `QueueName` includes `'discover-refresh'`; `handlers['discover-refresh']`.

- [ ] **Step 1: Extend `jobs/types.ts`**

```ts
export type QueueName =
  | 'index-message'
  | 'lcm-post-turn'
  | 'memory-consolidate'
  | 'kb-sync'
  | 'discover-refresh'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-consolidate',
  'kb-sync',
  'discover-refresh'
]
```

(Leave `JobMessage` and `KbSyncPayload` as they are — this queue's payload is
just `{ force?: boolean }`, defined inline at the handler.)

- [ ] **Step 2: Add the handler**

In `src/main/lib/jobs/handlers.ts`, add the import:

```ts
import { runDiscoverRefresh } from '../discover/manager'
```

Add to the `handlers` record (after `'kb-sync'`):

```ts
    'discover-refresh': async (payload) => {
      const p = payload as { force?: boolean }
      await runDiscoverRefresh({ force: p?.force })
    }
```

- [ ] **Step 3: Add handler tests**

Append to `tests/unit/main/lib/jobs/handlers.test.ts`. Add near the top,
alongside the other module mocks:

```ts
const mockRunDiscoverRefresh = vi.fn()
vi.mock('@main/lib/discover/manager', () => ({
  runDiscoverRefresh: mockRunDiscoverRefresh
}))
```

Then a describe block:

```ts
describe('handlers.discover-refresh', () => {
  it('forwards the force flag to runDiscoverRefresh', async () => {
    mockRunDiscoverRefresh.mockResolvedValue(undefined)
    await handlers['discover-refresh']({ force: true })
    expect(mockRunDiscoverRefresh).toHaveBeenCalledWith({ force: true })
  })

  it('treats an empty payload as force: undefined', async () => {
    mockRunDiscoverRefresh.mockResolvedValue(undefined)
    await handlers['discover-refresh']({})
    expect(mockRunDiscoverRefresh).toHaveBeenCalledWith({ force: undefined })
  })
})
```

- [ ] **Step 4: Update the other jobs tests' handler mock maps**

In `tests/unit/main/lib/jobs/worker.test.ts` and
`tests/unit/main/lib/jobs/queries.integration.test.ts`, add
`'discover-refresh': vi.fn()` to the mocked `handlers` record (same spot
`'kb-sync': vi.fn()` was added for the Knowledge Base work).

- [ ] **Step 5: Wire the periodic check into the cron**

In `src/main/lib/jobs/worker.ts`, `enqueueAndProcess` is already defined in
this same file — no new import needed. In `initJobQueue()`, after the
Knowledge Base reconcile `cron.schedule` block, add:

```ts
// Discover's own staleness gate lives inside runDiscoverRefresh — this just
// gives it a chance to run periodically while the app is open. In practice
// this produces roughly one real refresh a day, whenever the app happens to
// be running, with no dependency on a specific wall-clock hour.
cron.schedule('*/30 * * * *', () => {
  enqueueAndProcess('discover-refresh', {}).catch((error) => {
    logger.error('discover', 'periodic refresh enqueue failed', {
      error: String(error)
    })
  })
})
```

- [ ] **Step 6: Run + typecheck**

Run: `pnpm test jobs discover && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/lib/jobs tests/unit/main/lib/jobs
git commit -m "feat(discover): discover-refresh queue + periodic check"
```

---

## Task 6: `/api/discover` router

**Files:**

- Create: `src/main/lib/server/routes/discover.ts`
- Modify: `src/main/lib/server/app.ts` (import + mount)
- Create: `tests/api/discover.spec.ts`

**Interfaces:**

- Consumes: `getDiscoverFeed`, `setDiscoverFeed` (Task 2); `getSettings`
  (`@main/lib/db/queries`); `enqueueAndProcess`, `logEnqueueFailure`
  (`@main/lib/jobs/worker`); `successResponse` (`../utils`); `DiscoverFeedDto`
  (Task 1).
- Produces:
  - `GET /api/discover` → `DiscoverFeedDto`.
  - `POST /api/discover/refresh` → `DiscoverFeedDto` (either the current row
    unchanged, if already refreshing or within cooldown, or the row with
    `status` optimistically set to `'refreshing'`).

- [ ] **Step 1: Write the router**

```ts
// src/main/lib/server/routes/discover.ts
import type { DiscoverFeedDto } from '@shared/types/discover'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { getDiscoverFeed, setDiscoverFeed } from '../../db/discover-queries'
import { getSettings } from '../../db/queries'
import type { DiscoverFeedRow } from '../../db/schema'
import { enqueueAndProcess, logEnqueueFailure } from '../../jobs/worker'
import { successResponse } from '../utils'

const router = new Hono<{ Variables: Variables }>()

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000

function toDto(row: DiscoverFeedRow): DiscoverFeedDto {
  return {
    groups: row.groups,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    status: row.status
  }
}

router.get('/', async (c) => {
  const row = await getDiscoverFeed()
  return successResponse(c, toDto(row))
})

router.post('/refresh', async (c) => {
  const row = await getDiscoverFeed()

  // Guard mirrors runDiscoverRefresh's own early-return checks (disabled, no
  // Brave key). Without this, a refresh triggered in either state would flip
  // status to 'refreshing' here and then never flip back — the job itself
  // returns before ever calling setDiscoverFeed again in both cases, leaving
  // the row stuck at 'refreshing' permanently.
  const settings = await getSettings()
  if (!settings.discover?.enabled || !settings.webSearch?.braveApiKey) {
    return successResponse(c, toDto(row))
  }

  if (row.status === 'refreshing') {
    return successResponse(c, toDto(row))
  }
  if (
    row.generatedAt &&
    Date.now() - row.generatedAt.getTime() < REFRESH_COOLDOWN_MS
  ) {
    return successResponse(c, toDto(row))
  }

  await setDiscoverFeed({ status: 'refreshing' })
  await enqueueAndProcess('discover-refresh', { force: true }).catch((e) =>
    logEnqueueFailure('discover-refresh', e)
  )
  return successResponse(c, toDto({ ...row, status: 'refreshing' }))
})

export default router
```

- [ ] **Step 2: Mount it**

`src/main/lib/server/app.ts`: add
`import discoverRouter from './routes/discover'` (alphabetically, between
`deepResearchRouter` and `historyRouter`) and
`app.route('/api/discover', discoverRouter)` (alongside the other `app.route`
calls, e.g. right after `/api/deep-research`).

- [ ] **Step 3: Write the API test**

```ts
// tests/api/discover.spec.ts
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Discover API', () => {
  test('GET /api/discover returns the empty-state shape before any refresh', async ({
    api
  }) => {
    const { status, data } = await api.get<{
      groups: unknown[]
      generatedAt: string | null
      status: string
    }>('/api/discover')
    expect(status).toBe(200)
    expect(Array.isArray(data.groups)).toBe(true)
    expect(['idle', 'refreshing', 'failed']).toContain(data.status)
  })

  test('POST /api/discover/refresh no-ops while Discover is disabled', async ({
    api
  }) => {
    await api.updateSettings({ discover: { enabled: false } })
    const res = await api.post<{ status: string }>('/api/discover/refresh')
    expect(res.status).toBe(200)
    // Disabled is a deterministic short-circuit — the route never touches the
    // row, so status can never become 'refreshing' here.
    expect(res.data.status).not.toBe('refreshing')
  })

  test('POST /api/discover/refresh no-ops when no Brave key is configured', async ({
    api
  }) => {
    await api.updateSettings({
      discover: { enabled: true },
      webSearch: { braveApiKey: '' }
    })
    const res = await api.post<{ status: string }>('/api/discover/refresh')
    expect(res.status).toBe(200)
    expect(res.data.status).not.toBe('refreshing')
    await api.updateSettings({ discover: { enabled: false } })
  })
})
```

Note: a strict "second call within the cooldown returns the same state as
the first" test is intentionally not written here — with a real background
job wired to a real pgmq queue, an enabled+configured refresh can complete
before the second HTTP call lands, making status a race rather than a
deterministic assertion. The cooldown branch's actual logic (a few
straightforward lines gated on `row.status`/`row.generatedAt`) is exercised
deterministically instead by the manager's own tests in Task 4 via
`runDiscoverRefresh`'s equivalent staleness gate, and is simple enough to
verify by reading `src/main/lib/server/routes/discover.ts` directly during
review.

- [ ] **Step 4: Run + typecheck**

Run: `npm run typecheck && pnpm test`
Expected: PASS. (The API spec runs under Playwright, per the repo's
`pnpm test:e2e:api` — if the dev server on `:60223` is unreachable/lock-gated
in this environment, note it as written-but-unverified rather than blocking,
same as the Knowledge Base API spec was handled.)

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/server/routes/discover.ts src/main/lib/server/app.ts \
  tests/api/discover.spec.ts
git commit -m "feat(discover): /api/discover router"
```

---

## Task 7: Renderer service

**Files:**

- Create: `src/renderer/services/discover.ts`

**Interfaces:**

- Consumes: `DiscoverFeedDto` (Task 1); `fetcher` (`@shared/utils/http`).
- Produces:
  - `getDiscoverFeed(): Promise<DiscoverFeedDto>`
  - `refreshDiscoverFeed(): Promise<DiscoverFeedDto>`

- [ ] **Step 1: Write the service**

```ts
// src/renderer/services/discover.ts
import type { DiscoverFeedDto } from '@shared/types/discover'
import { fetcher } from '@shared/utils/http'

export const getDiscoverFeed = () => fetcher<DiscoverFeedDto>('/api/discover')

export const refreshDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/discover/refresh', { method: 'POST' })
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/services/discover.ts
git commit -m "feat(discover): renderer service"
```

---

## Task 8: Settings UI

**Files:**

- Modify: `src/renderer/components/settings/settings-menu.ts` (`Discover` label + Personal group entry)
- Modify: `src/renderer/components/settings/settings-form.tsx` (import + dispatch)
- Create: `src/renderer/components/settings/settings-form/discover.tsx`
- Modify: `src/shared/constants/test-ids.ts` (add `discover.enableToggle`)
- Create: `tests/e2e/settings-discover.spec.ts`

**Interfaces:**

- Consumes: `refreshDiscoverFeed` (Task 7); `UseFormReturnType`
  (`@shared/schemas/settings-schema`); `SettingsSection`, `SettingsRow`
  (`../settings-row`).
- Produces: `SettingsLabel.Discover = 'Discover'`; RHF field paths
  `discover.enabled`, `discover.topicCount`, `discover.articlesPerTopic`.

- [ ] **Step 1: Add the test-id**

`src/shared/constants/test-ids.ts`, add near `knowledgeBase`:

```ts
  discover: {
    enableToggle: 'discover.enable-toggle'
  },
```

- [ ] **Step 2: Add the menu entry**

`settings-menu.ts`:

- Add `NewspaperIcon` to the lucide-react import list.
- Add `Discover = 'Discover',` to the `SettingsLabel` enum, right after
  `Memory = 'Memory',`.
- In the `Personal` group's `items` array, insert
  `{ title: SettingsLabel.Discover, icon: NewspaperIcon },` right after the
  `Memory` entry and before `Voice`.

- [ ] **Step 3: Write the settings page**

```tsx
// src/renderer/components/settings/settings-form/discover.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { getHttpErrorMessage } from '@shared/utils/http'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { refreshDiscoverFeed } from '../../../services/discover'
import { SettingsRow, SettingsSection } from '../settings-row'

export function Discover({ form }: { form: UseFormReturnType }) {
  const [refreshing, setRefreshing] = useState(false)
  const hasBraveKey = !!form.watch('webSearch.braveApiKey')

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshDiscoverFeed()
      sileo.success({ title: 'Refresh queued' })
    } catch (e) {
      sileo.error({
        title: 'Failed to refresh',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Discover turns your saved Memory into a personalized news feed on the
          home page — enabling it sends memory-derived search terms to Brave
          (the same provider used for Web Search) roughly once a day. Off by
          default; nothing leaves your machine until you turn it on.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <SettingsRow
          label="Enable Discover"
          description="Show a personalized news feed on the home page."
        >
          <Controller
            control={form.control}
            name="discover.enabled"
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                data-testid={TEST_IDS.discover.enableToggle}
              />
            )}
          />
        </SettingsRow>

        {!hasBraveKey && (
          <p className="text-muted-foreground -mt-1 text-xs">
            Add a Brave Search API key under Web Search to use Discover.
          </p>
        )}

        <Controller
          control={form.control}
          name="discover.topicCount"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Topics"
              description="How many memory-derived topics to show. Default 4."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={8}
                className="w-20"
                placeholder="4"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="discover.articlesPerTopic"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Articles per topic"
              description="How many articles per topic row. Default 3."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={5}
                className="w-20"
                placeholder="3"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </SettingsRow>
          )}
        />

        <SettingsRow
          label="Refresh"
          description="Manually refresh the feed now."
          layout="vertical"
        >
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
```

- [ ] **Step 4: Wire the dispatch**

`settings-form.tsx`:

- Add `import { Discover } from './settings-form/discover'` (alphabetically,
  after `import { DeepResearch } from './settings-form/deep-research'` and
  before `import { FullTextSearch } from './settings-form/full-text-search'`).
- Add the dispatch line right after the `Memory` one:

```tsx
{
  activeTitle === SettingsLabel.Discover && <Discover form={form} />
}
```

- [ ] **Step 5: Write the e2e test**

```ts
// tests/e2e/settings-discover.spec.ts
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Discover', () => {
  test('renders the toggle and the no-Brave-key hint by default', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Discover', exact: true })
      .click()

    await expect(
      mainWindow.getByTestId(TEST_IDS.discover.enableToggle)
    ).toBeVisible()
    await expect(
      mainWindow.getByText(
        'Add a Brave Search API key under Web Search to use Discover.'
      )
    ).toBeVisible()
  })
})
```

- [ ] **Step 6: Run the gate**

```bash
pnpm format && pnpm lint && npm run typecheck && pnpm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/settings src/shared/constants/test-ids.ts \
  tests/e2e/settings-discover.spec.ts
git commit -m "feat(discover): Settings -> Discover page"
```

---

## Task 9: Home-page wiring

**Files:**

- Modify: `src/renderer/containers/home.tsx`
- Modify: `src/renderer/components/chat.tsx`
- Modify: `src/renderer/components/messages.tsx`
- Create: `src/renderer/components/home/discover-feed.tsx`
- Modify: `src/shared/constants/test-ids.ts` (add `discover.section`)
- Create: `tests/e2e/home-discover.spec.ts`

**Interfaces:**

- Consumes: `getDiscoverFeed`, `refreshDiscoverFeed` (Task 7);
  `DiscoverFeedDto` (Task 1); `useSettings` (`@/hooks/use-settings`);
  `LazyLoadImage` (`@/components/lazy-load-image`); `SourceFavicon`
  (`@/components/source-favicon`).
- Produces: `showDiscover?: boolean` threaded `Home → Chat → Messages`;
  `<DiscoverFeed />` component.

- [ ] **Step 1: Add the second test-id**

`src/shared/constants/test-ids.ts`, extend the `discover` group added in
Task 8:

```ts
  discover: {
    enableToggle: 'discover.enable-toggle',
    section: 'discover.section'
  },
```

- [ ] **Step 2: `Home` passes `showDiscover`**

`src/renderer/containers/home.tsx`:

```tsx
import { useSearchParams } from 'react-router'
import { v4 as uuidV4 } from 'uuid'

import { Chat } from '@/components/chat'

export function Home() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined

  return (
    <Chat
      id={uuidV4()}
      initialMessages={[]}
      projectId={projectId}
      chatTitle="New chat"
      showDiscover={projectId == null}
    />
  )
}
```

- [ ] **Step 3: `Chat` forwards `showDiscover`**

`src/renderer/components/chat.tsx`:

In the `Props` interface (~line 41), add:

```ts
  showDiscover?: boolean
```

In the function signature (~line 48), destructure it:

```ts
export function Chat({ id, initialMessages, projectId, chatTitle, showDiscover }: Props) {
```

In the returned JSX (~line 144), pass it through to `Messages`:

```tsx
<Messages
  chatId={id}
  status={status}
  messages={messages}
  regenerate={regenerate}
  showDiscover={showDiscover}
/>
```

- [ ] **Step 4: `Messages` renders `DiscoverFeed` in the empty state**

`src/renderer/components/messages.tsx`:

Add the import (alongside the other `./web-search/*` imports, ~line 31):

```ts
import { DiscoverFeed } from './home/discover-feed'
```

Extend `MessagesProps` (~line 33):

```ts
type MessagesProps = {
  chatId: string
  status: ChatStatus
  messages: ChatMessage[]
  regenerate: () => void
  showDiscover?: boolean
}
```

Destructure it in the function signature (~line 411):

```ts
function Messages({ chatId, status, messages, regenerate, showDiscover }: MessagesProps) {
```

Replace the empty-state block (~line 478-485):

```tsx
{
  messages.length === 0 && (
    <div
      className={cn(
        'animate-fade-in-up mx-auto flex size-full max-w-4xl flex-col px-8',
        showDiscover
          ? 'justify-start pt-12 md:pt-16'
          : 'justify-center md:mt-20'
      )}
    >
      <p className="text-3xl font-bold tracking-tight">Hello there!</p>
      <p className="text-muted-foreground mt-2 text-lg">
        How can I assist you today?
      </p>
      {showDiscover && <DiscoverFeed />}
    </div>
  )
}
```

(`cn` is already imported in this file — no new import needed for that part.)

- [ ] **Step 5: Write `DiscoverFeed`**

```tsx
// src/renderer/components/home/discover-feed.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import type { DiscoverFeedDto } from '@shared/types/discover'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { SourceFavicon } from '@/components/source-favicon'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { getDiscoverFeed, refreshDiscoverFeed } from '../../services/discover'

const POLL_MS = 3000

export function DiscoverFeed() {
  const { data: settings } = useSettings()
  const [feed, setFeed] = useState<DiscoverFeedDto | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const enabled = settings?.discover?.enabled ?? false

  useEffect(() => {
    if (!enabled) return
    getDiscoverFeed().then(setFeed)
  }, [enabled])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (enabled && feed?.status === 'refreshing') {
      pollRef.current = setInterval(() => {
        getDiscoverFeed().then(setFeed)
      }, POLL_MS)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [enabled, feed?.status])

  if (!enabled || !feed) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      setFeed(await refreshDiscoverFeed())
    } finally {
      setRefreshing(false)
    }
  }

  const isBusy = refreshing || feed.status === 'refreshing'

  if (feed.groups.length === 0) {
    return (
      <p className="text-muted-foreground mt-10 text-center text-sm">
        {feed.generatedAt
          ? 'No recommendations right now.'
          : 'Discover is warming up…'}
      </p>
    )
  }

  return (
    <div
      className="mt-10 flex flex-col gap-6"
      data-testid={TEST_IDS.discover.section}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Discover
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isBusy}
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCwIcon className={cn('size-4', isBusy && 'animate-spin')} />
        </Button>
      </div>

      {feed.groups.map((group) => (
        <div key={group.memoryId}>
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            {group.topic}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {group.articles.map((article) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-52 shrink-0"
              >
                {article.thumbnail && (
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    <LazyLoadImage
                      src={article.thumbnail}
                      alt={article.title}
                      className="size-full"
                    />
                  </div>
                )}
                <div className="mt-1.5 line-clamp-2 text-sm font-medium">
                  {article.title}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <SourceFavicon
                    link={article.url}
                    favicon={article.favicon}
                    className="size-3.5"
                  />
                  <span className="truncate">{article.source}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write the e2e test**

```ts
// tests/e2e/home-discover.spec.ts
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Home — Discover', () => {
  test('shows no Discover section when the feature is off (the default)', async ({
    mainWindow
  }) => {
    await expect(mainWindow.getByText('Hello there!')).toBeVisible()
    await expect(
      mainWindow.getByTestId(TEST_IDS.discover.section)
    ).not.toBeAttached()
  })
})
```

- [ ] **Step 7: Run the gate**

```bash
pnpm format && pnpm lint && npm run typecheck && pnpm test
```

Expected: PASS. Pay particular attention to `npm run typecheck` here — this
task edits three shared components (`Chat`, `Messages`, and by extension every
consumer of `Chat`, e.g. `ChatDetail`). A type error anywhere in that call
chain must be resolved before moving on, not deferred to a later task.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/containers/home.tsx src/renderer/components/chat.tsx \
  src/renderer/components/messages.tsx src/renderer/components/home \
  src/shared/constants/test-ids.ts tests/e2e/home-discover.spec.ts
git commit -m "feat(discover): show the Discover feed on the true home route only"
```

---

## Task 10: Docs + final gate

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: `CLAUDE.md`**

In the `src/main/lib/` map (near the `search`/`knowledge-base` entries), add:

```
- `src/main/lib/discover/` — Home Discover feed: Brave News client, memory-driven
  query generation, `runDiscoverRefresh` (see docs/superpowers/specs/2026-09-05-home-discover-feed-design.md)
```

In the jobs list, add `discover-refresh` alongside `index-message` /
`lcm-post-turn` / `memory-consolidate` / `kb-sync`.

- [ ] **Step 2: Final full gate**

```bash
pnpm format && pnpm lint && npm run typecheck && pnpm test && npx electron-vite build
```

Expected: all PASS / build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(discover): CLAUDE.md pointers"
```

---

## Self-Review

**1. Spec coverage**

| Spec section                                                | Task                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| §1 Settings schema                                          | 1                                                    |
| §2 Data model (`discover_feed`)                             | 1                                                    |
| §3 Brave News client                                        | 3                                                    |
| §4 Query generation (candidate pool, newsworthiness filter) | 4                                                    |
| §5 `runDiscoverRefresh` (staleness gate, error handling)    | 4                                                    |
| §6 Job queue integration (queue, handler, periodic check)   | 5                                                    |
| §7 Routes + shared types                                    | 1 (types), 6 (routes)                                |
| §8 Renderer service                                         | 7                                                    |
| §9 Home/Chat/Messages wiring                                | 9                                                    |
| §10 Settings UI                                             | 8                                                    |
| Error-handling table                                        | 4 (manager-level cases), 6 (route-level cooldown)    |
| Testing section                                             | every task's test steps                              |
| Rollout (dark by default)                                   | Global Constraints + Task 4's disabled/no-key no-ops |

No gaps.

**2. Placeholder scan** — no "TBD"/"add error handling"/"similar to Task N";
every code step has complete, runnable content. The one deferred item (exact
`meta_url`/`thumbnail` sub-shape from a live Brave response) is called out in
the spec itself as a implementation-time verification, and Task 3's client
already has a reasonable, defensive fallback chain (`source ??
meta_url?.hostname ?? safeHostname(url)`) rather than assuming a shape it
can't be sure of — not a placeholder, a resilient default.

**3. Type consistency**

- `DiscoverFeedDto`/`DiscoverGroup`/`DiscoverArticle` (Task 1) are the exact
  types re-exported and consumed unchanged through Tasks 6, 7, and 9 — no
  renamed fields anywhere in the chain.
- `getDiscoverFeed()` name collision: Task 2 defines
  `db/discover-queries.ts#getDiscoverFeed` (returns `DiscoverFeedRow`, main
  process); Task 7 defines `services/discover.ts#getDiscoverFeed` (returns
  `Promise<DiscoverFeedDto>`, renderer, calls the HTTP route). These are two
  different modules in two different processes and are never imported into
  the same file, so the same name is safe — flagging explicitly here so an
  implementer doesn't "fix" an imagined collision.
- `setDiscoverFeed(patch)` — Task 2's patch shape
  (`Partial<{groups,generatedAt,status,error}>`) matches every call site:
  Task 4's `{status:'refreshing'}`, `{groups,generatedAt,status,error}` on
  success, `{status:'failed',error}` on failure; Task 6's route
  `{status:'refreshing'}`. Consistent.
- `runDiscoverRefresh(opts?: {force?: boolean})` — Task 4 defines it, Task 5's
  handler calls `runDiscoverRefresh({force: p?.force})`, Task 6's route
  enqueues `{force: true}` which the handler forwards unchanged. Consistent.
- `showDiscover` — `boolean | undefined` end-to-end from `Home` through
  `Chat`'s `Props` to `Messages`' `MessagesProps`; no task narrows or widens
  the type along the way.

No mismatches found.
