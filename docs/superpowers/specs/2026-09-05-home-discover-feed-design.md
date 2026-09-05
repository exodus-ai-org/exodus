# Home Discover Feed — Design

## Context

Today `/` (`src/renderer/containers/home.tsx`) is not a real home page — it just
mints a fresh chat id and renders `<Chat initialMessages={[]} />`. The only thing
distinguishing an empty chat from any other is two lines of greeting text inside
`Messages`' shared empty-state block (`messages.length === 0`). There is no
dashboard, no personalization, nothing that reads the user's own data back to
them.

The user wants a Chrome-iOS-Discover-style module on the home page: personalized
news, generated from their own long-term Memory (`memory` table — `profile` /
`topic` / `person` sections; see `[[memory-v2]]` and `docs/superpowers/specs/*memory*`
history) rather than anything the user explicitly asks for. Inspiration + worked
examples (a cat named Meiji whose health the user tracks, stock positions like
SoftBank 9984, football teams followed) came from a live design session using
the brainstorming visual companion; see decisions below.

Brave (already integrated for the `webSearch` tool via
`src/main/lib/ai/utils/web-search-util.ts`) also exposes a News Search endpoint
(`GET /res/v1/news/search`) that nothing in the codebase calls yet.

## Decisions (from brainstorming, 2026-09-05)

1. **Full landing-page scope, not a tiny insert.** The user explicitly accepted
   a home-page redesign. Greeting + input stay pinned near the top; the Discover
   feed occupies the space below, inside the same scrollable area `Messages`
   already owns.
2. **Visual style: grouped rows by memory topic** ("A" from the visual
   session) — an explicit section per source memory (e.g. "Meiji", "SoftBank
   (9984)"), each a horizontally-scrolling row of article cards. Rejected: a
   single unified vertical feed (too much vertical space, too close to "another
   app inside the app") and a text-only briefing list (loses the
   glanceable/visual appeal that was the whole point).
3. **Privacy default: off.** Discover exports memory content to a third-party
   API (Brave) as search queries — categorically different from Memory's
   existing uses (kept in local model context only). `discover.enabled`
   defaults `false`; the user must opt in from Settings.
4. **Cadence: cached, ~daily, plus manual refresh.** Never call Brave/the LLM
   on every home-page load. A background job refreshes on a staleness check
   (~20h); a refresh button bypasses that with a short cooldown.
5. **Selection: rank by recency, filter by an LLM newsworthiness judgment — not
   a section-based (`topic` vs `profile`) hard filter.** Validated against a
   real memory export during brainstorming: recency correctly surfaces
   "SoftBank Q1 analysis" and "Meiji's health" while an LLM pass correctly
   drops "は/が particle study" and "Clash Verge proxy debugging" even though
   both are recent. A `section` filter alone would have missed the Meiji case
   (a pet could plausibly land in `person`, not `topic`).
6. **Reuse the existing Brave API key** (`settings.webSearch.braveApiKey`). No
   separate key field — it's the same Brave account either way.

## Goals

- With Discover enabled and a Brave key configured, the home page (and only the
  home page — not `/chat/:id`, not "new chat inside a Project") shows up to
  `topicCount` (default 4) grouped rows of up to `articlesPerTopic` (default 3)
  news cards, generated from the user's own active memories.
- A background job keeps this cached and fresh (~daily) without calling Brave
  or an LLM on every page load; a manual refresh is available and rate-limited.
- Zero behavior change when disabled (the default) or when no Brave key is
  configured — home page looks exactly as it does today.
- A failed refresh never blanks a working feed — it just keeps yesterday's.

## Non-Goals

- No per-article state (read/unread/dismissed/saved). If this is wanted later,
  it's an additive change on top of the cache-blob model below, not a
  redesign.
- No topic curation UI (can't manually pick "always include SoftBank" or
  exclude a memory from consideration) — selection is fully automatic from
  active memories. Revisit if it turns out to matter in practice.
- No cross-device sync of the feed (this is a single-user local app like
  everything else here).
- Not a chat tool — Discover never runs during a chat turn and is not bound
  via `bindCallingTools`. It's a passive background feature read by the home
  page only.
- No new locale settings — reuses `webSearch.country`/`webSearch.languages`
  for consistency with the user's existing search configuration rather than
  adding a parallel set of fields.

## Architecture

### 1. Settings schema

`src/shared/schemas/settings-schema.ts`, near `WebSearchSchema`:

```ts
export const DiscoverSchema = z.object({
  enabled: z.boolean().default(false),
  topicCount: formNumber(z.number().gte(1).lte(8)).nullish(), // default 4
  articlesPerTopic: formNumber(z.number().gte(1).lte(5)).nullish() // default 3
})
```

`SettingsSchema` gains `discover: DiscoverSchema.nullish()`. `settings.discover`
jsonb column on `db/schema.ts`'s `settings` table (same pattern as
`fullTextSearch`/`knowledgeBase`).

### 2. Data model

New singleton-row table (same idiom as `settings`: one fixed-id row, not a
per-user table, since this app is single-user):

```ts
export const discoverStatusEnum = pgEnum('discover_feed_status', [
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
  status: discoverStatusEnum('status').notNull().default('idle'),
  error: text('error')
})
```

`DiscoverGroup`/`DiscoverArticle` (shared type, §7) live in JSON — no relational
columns, no FK to `memory` (the cache is regenerated wholesale daily; a stale
`memoryId` reference inside last night's cached JSON is harmless and never
queried against the `memory` table). This deliberately mirrors the
"cache-blob, not a normalized table" choice already made for `settings` itself,
and is simpler than the Knowledge Base's per-doc-row model because Discover has
no per-item lifecycle (no editing, no individual delete) — the whole feed is
replaced atomically on every refresh.

### 3. Brave News client

`src/main/lib/discover/brave-news-client.ts` — small, single-purpose, mirrors
the endpoint-centralization discipline from `lightrag-client.ts`:

```ts
export interface BraveNewsArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  age?: string
}

export async function searchBraveNews(
  apiKey: string,
  query: string,
  opts: { count: number; country?: string | null; language?: string | null }
): Promise<BraveNewsArticle[]>
```

`GET https://api.search.brave.com/res/v1/news/search` with
`headers: { accept: 'application/json', 'x-subscription-token': apiKey }` (same
casing as `web-search-util.ts`) and params `q`, `count` (capped to 5),
`freshness=pd` (past 24h — matches the daily cadence), `country`
(lowercased, from `settings.webSearch.country`), `search_lang` (first of
`settings.webSearch.languages`). Maps each result to `BraveNewsArticle`:
`title`, `url`, `description`, `source` (prefer a `source` field if present,
else `meta_url.hostname`, else `new URL(url).hostname` as a last resort —
**verify the exact `meta_url`/`thumbnail` sub-shape against one live call
before finalizing this mapping**, same caveat as LightRAG's response shapes
were confirmed during implementation), `favicon` from `meta_url.favicon`,
`thumbnail` from `thumbnail.src`, `age` passed through as-is. Never throws on a
malformed single result — skip it and keep the rest; throws only on a
non-2xx/network failure for the whole query (caller treats one failed query as
one failed group, not a failed refresh).

### 4. Query generation

`src/main/lib/discover/manager.ts`:

```ts
const DiscoverQuerySchema = z.object({
  items: z.array(
    z.object({
      memoryId: z.string(),
      topic: z.string().min(1), // short display label, e.g. "Meiji"
      query: z.string().min(1).nullable() // Brave News query, or null = skip
    })
  )
})
```

System prompt (paraphrased — final copy at implementation time): _"For each
memory below, decide whether it could plausibly have real, current news
attached to it (a company/stock, a sports team, a product category, an ongoing
personal situation like a pet's health) — if so, write one concise, high-signal
news search query and a 2–4 word topic label; if it's a personal habit, skill
practice, or private/local detail with no news angle (e.g. language-study
progress, home-network configuration), set query to null. Return ONLY JSON:
{ "items": [...] }."_ Uses `completeSimple(chatModel, { systemPrompt, messages
}, { apiKey })` from `@mariozechner/pi-ai` (same call shape as
`memory/manager.ts`), then the existing shared helpers
`extractTextFromCompletion()` / `parseJsonFromLlmResponse()`
(`src/main/lib/ai/utils/llm-response-util.ts` — reuse these, do not re-hand-roll
the regex-extract-then-`JSON.parse` logic `memory/manager.ts` has locally),
then `DiscoverQuerySchema.safeParse(...)`.

**Candidate pool vs. final count:** feed the LLM more candidates than
`topicCount` (`min(activeMemories.length, topicCount + 4)`, ranked by
`lastUsedAt ?? updatedAt` descending) since some will be judged non-newsworthy
and skipped — then take the first `topicCount` surviving (`query != null`)
items, in the same recency order, as the final groups. This is the exact
dynamic validated in the brainstorming worked example (6–8 candidates in,
4 genuine topics out, grammar-study and proxy-debugging correctly dropped).

### 5. `runDiscoverRefresh`

`src/main/lib/discover/manager.ts`:

```ts
export async function runDiscoverRefresh(opts: {
  force?: boolean
}): Promise<void>
```

1. Load settings. If `!settings.discover?.enabled` → return (no-op).
2. If no `settings.webSearch?.braveApiKey` → return (no-op; the Settings UI
   shows its own "add a Brave key" hint client-side, no stored status needed
   for this case).
3. Read the current `discover_feed` row. If `!opts.force` and `generatedAt` is
   less than ~20h old → return (still fresh, nothing to do).
4. Set `status: 'refreshing'`.
5. `getActiveMemories(LOCAL_USER_ID)` → build the candidate pool (§4) →
   `getModelFromProvider(settings)` → one `completeSimple` call → parse.
6. For each surviving `{memoryId, topic, query}`, call `searchBraveNews(...)`
   — run all queries via `Promise.allSettled` (one failed query drops that
   group, doesn't fail the refresh). Drop any group whose search returned zero
   articles (an empty section is worse than no section).
7. Write `{ groups, generatedAt: now(), status: 'idle', error: null }`.
8. On any thrown error before step 7 completes (misconfigured provider, LLM
   call failure, etc.): write `{ status: 'failed', error: String(err) }` **but
   leave `groups`/`generatedAt` untouched** — yesterday's feed keeps showing —
   and rethrow so the job queue's normal retry applies (see §6).

### 6. Job queue integration

`src/main/lib/jobs/types.ts`: add `'discover-refresh'` to `QueueName` /
`QUEUE_NAMES`; payload `{ force?: boolean }`.

`src/main/lib/jobs/handlers.ts`: `'discover-refresh': (payload) =>
runDiscoverRefresh(payload as { force?: boolean })`.

`src/main/lib/jobs/worker.ts`, `initJobQueue()`: add a periodic check —
same style as the Knowledge Base's `reconcileKnowledgeIndexStatus` cron, but
even simpler since the staleness gate lives inside `runDiscoverRefresh` itself:

```ts
cron.schedule('*/30 * * * *', () => {
  enqueueAndProcess('discover-refresh', {}).catch((error) => {
    logger.error('discover', 'periodic refresh enqueue failed', {
      error: String(error)
    })
  })
})
```

Every 30 minutes the app is open, this fires; `runDiscoverRefresh` no-ops
unless the feed is actually >20h stale (or disabled/unconfigured), so in
practice a refresh happens roughly once a day, whenever the app happens to be
running — no dependency on the app being open at a specific wall-clock hour.
A refresh that fails and gets given up on by pgmq (5 attempts) is naturally
retried by the _next_ periodic check, since `generatedAt` never advanced —
this is intentional, low-frequency, and harmless (matches the "quietly keep
trying in the background" posture of `index-message`/`kb-sync`).

### 7. Routes + shared types

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

`src/main/lib/server/routes/discover.ts`, mounted at `/api/discover`:

| Method + path   | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`         | Returns the current `DiscoverFeedDto` (empty groups + `status:'idle'` + `generatedAt:null` if never refreshed).                                                                                                                                                                                                                                                                                                              |
| `POST /refresh` | If `status === 'refreshing'` → return the current row as-is (already in flight, don't double-enqueue). Else if `generatedAt` is within a short cooldown (~5 min) → return the current row unchanged (no error — just "nothing new yet"). Else: synchronously set `status:'refreshing'` (blocks a rapid double-click race), `enqueueAndProcess('discover-refresh', {force:true})`, return the row with `status:'refreshing'`. |

### 8. Renderer service

`src/renderer/services/discover.ts`:

```ts
export const getDiscoverFeed = () => fetcher<DiscoverFeedDto>('/api/discover')
export const refreshDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/discover/refresh', { method: 'POST' })
```

### 9. Home-page wiring (the risky part — shared components)

`Home` (`src/renderer/containers/home.tsx`) is also the route for "new chat
inside a Project" (`/?projectId=X`), and `Chat`/`Messages` are the same
components `ChatDetail` (`/chat/:id`) uses. Discover must show **only** on the
true home route. Thread an explicit boolean rather than infer it:

- `Home`: computes `showDiscover = projectId == null` and passes it to `Chat`.
- `Chat` (`src/renderer/components/chat.tsx`): accepts an optional
  `showDiscover?: boolean` prop, forwards it to `Messages`. `ChatDetail` never
  passes this prop, so it's `undefined`/falsy there regardless of message
  count — no behavior change on `/chat/:id`.
- `Messages` (`src/renderer/components/messages.tsx`): accepts
  `showDiscover?: boolean`. The existing
  `messages.length === 0 && (...)` block only adds the Discover feed when
  `showDiscover` is also true; the plain two-line greeting still renders
  unconditionally for every other empty-chat case (project new-chat, a
  not-yet-loaded `/chat/:id`). When `showDiscover` is true, the block's layout
  switches from vertically-centered (`justify-center md:mt-20`) to top-aligned,
  since a scrollable feed below it shouldn't be vertically centered — exact
  className changes are an implementation detail, not a spec-level decision.
- New `src/renderer/components/home/discover-feed.tsx` renders the actual
  groups (fetched via `getDiscoverFeed()` on mount) inside that block, one row
  per group: a topic label + a horizontal-scroll row of `DiscoverCard`s,
  reusing the exact layout pattern from `web-search/video-cards.tsx`
  (`flex gap-3 overflow-x-auto`, `w-52 shrink-0` cards, `aspect-video`
  `LazyLoadImage` thumbnail, `line-clamp-2` title, `SourceFavicon` + source
  name footer) minus the video play-button overlay. A small refresh icon
  button sits at the top-right of the whole section — click → optimistic
  `status:'refreshing'` locally, call `refreshDiscoverFeed()`, poll
  `getDiscoverFeed()` every ~3s until `status !== 'refreshing'` (same polling
  idea as the Knowledge Base document list). Renders nothing at all when
  `groups.length === 0` and `status === 'idle'` and `generatedAt === null`
  (first-ever state, before the first background refresh has run) **except** a
  small muted line — "Discover is warming up…" — so enabling it doesn't look
  broken while waiting for the first cron tick.

### 10. Settings UI

`SettingsLabel.Discover = 'Discover'` added to the `Personal` group, directly
after `Memory` (it reads Memory; conceptually adjacent). Icon: `NewspaperIcon`.

`src/renderer/components/settings/settings-form/discover.tsx`:

- Toggle "Enable Discover" — description states plainly that enabling it sends
  memory-derived search terms to Brave (the transparency the opt-in default
  is meant to back up).
- `topicCount` / `articlesPerTopic` number inputs (defaults 4 / 3).
- If `webSearch.braveApiKey` is empty (`form.watch`), show an inline hint:
  "Add a Brave Search API key under Web Search to use Discover" — no stored
  backend status needed for this, purely a client-side check against the
  already-loaded settings form.
- "Refresh now" button (same endpoint the home page's refresh icon uses) for
  convenience without leaving Settings.

## Error handling summary

| Failure                                       | Behavior                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discover disabled                             | Job no-ops immediately. Home page renders nothing extra.                                                                                                                                                                                                                          |
| No Brave key                                  | Job no-ops. Settings shows an inline hint (client-side check, no backend state).                                                                                                                                                                                                  |
| No active memories                            | Feed ends up `groups: []`. Home shows nothing (after the first-run "warming up" state has passed).                                                                                                                                                                                |
| LLM call fails (bad provider config, network) | `runDiscoverRefresh` sets `status:'failed'`, keeps the last-good `groups`/`generatedAt`, rethrows → pgmq retries per its normal visibility-timeout policy, then gives up after 5 attempts; the next periodic check (30 min later) tries again since `generatedAt` never advanced. |
| One Brave News query fails (of N)             | That group is dropped; the rest of the refresh proceeds normally.                                                                                                                                                                                                                 |
| A query returns zero articles                 | That group is dropped (no empty sections).                                                                                                                                                                                                                                        |
| Manual refresh spam                           | `status==='refreshing'` or within the cooldown window → route returns the current row unchanged instead of enqueueing again.                                                                                                                                                      |
| App closed for days                           | Feed just shows increasingly stale content until the app reopens and the next periodic check fires — no "expired" UI state, simply what was last cached.                                                                                                                          |

## Testing

**Unit** (`tests/unit/main/lib/discover/`):

- `brave-news-client.test.ts` — mocked `fetch`: correct URL/params/header;
  maps a result set to `BraveNewsArticle[]`; throws on non-2xx; malformed
  single result is skipped, not fatal.
- `manager.test.ts` — `runDiscoverRefresh`: no-ops when disabled; no-ops when
  no Brave key; no-ops when fresh (`force` absent, `generatedAt` recent);
  proceeds when `force:true` even if fresh; candidate-pool sizing
  (`topicCount + 4`, capped to available memories); parses a mocked
  `completeSimple` response into groups, dropping `query:null` items;
  `Promise.allSettled` — one query rejecting doesn't drop the others; a
  zero-result query is dropped; on thrown error, `status` becomes `failed`
  while `groups`/`generatedAt` are left untouched, and the error rethrows.

**API** (`tests/api/discover.spec.ts`):

- `GET /api/discover` returns the empty-state shape before any refresh.
- `POST /api/discover/refresh` respects the cooldown (second immediate call
  returns unchanged rather than re-triggering). Full end-to-end refresh
  against real Brave + a real LLM is guarded by
  `test.skip(!process.env.BRAVE_API_KEY, ...)` per the established pattern.

**E2E** (`tests/e2e/`):

- Settings → Discover renders the toggle + hint-when-no-key state.
- Home page shows no Discover UI at all when the setting is off (the
  default) — the one assertion that matters most for "never breaks the
  default experience."

## Rollout

Dark by default (`enabled: false`) — zero behavior change for every existing
user until they opt in from Settings. No data migration risk (new table, new
column); migration regenerated from scratch per this repo's established
workflow.

## Open items deferred

- Per-article dismiss/read state.
- Manually curating which memories feed Discover (include/exclude).
- Any UI distinction for `breaking` news (Brave's news API surfaces this
  field) — could be a small badge later.
- Confirming the exact `meta_url`/`thumbnail` sub-fields against a live Brave
  News response (noted inline in §3) — resolve during implementation, same as
  the LightRAG client's response-shape caveats were resolved during that
  build.
