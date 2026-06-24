# Web-Search Source Metadata + Citation Badge (M1) — Design

Date: 2026-06-24
Status: Approved (design), pending implementation plan

## Summary

Enrich web-search citations with Brave's source metadata. Request
`enable_source_metadata=true` on the `/llm/context` call, thread the new fields
(`site_name`, `favicon`, `hostname`, `age`, `thumbnail`) through
`WebSearchResult`, and upgrade the citation **badge** (favicon + site name,
ChatGPT-style) and its **hover card** (source thumbnail + freshness). The
**Sources panel** gets the same treatment for consistency.

This is **M1** of a larger "rich web-search media" initiative. **M2** (inline
image gallery + lightbox) and **M3** (YouTube video cards) are separate specs.
M1 is foundational: M2's lightbox source attribution reuses the favicon/site
name added here.

## Goals

- Pull Brave source metadata into each `WebSearchResult` (additive, optional).
- Badge shows **favicon + site name** instead of the raw page title.
- Brave favicon is primary; Google favicon API is the fallback.
- Hover card shows the source **thumbnail** (when present, via `LazyLoadImage`)
  and a **freshness/age** line.
- Sources panel mirrors the badge/card styling.

## Non-goals

- Image gallery / lightbox (M2) and video cards (M3).
- Changing what content is sent to the LLM (grounding snippets unchanged).
- Persisted-history backfill: older messages whose stored `WebSearchResult`s
  lack the new fields simply fall back to title/Google-favicon (graceful).

## Data flow

```
/llm/context?enable_source_metadata=true
  → BraveLlmContextSourceMeta { title, hostname, site_name, favicon, age[], thumbnail{src,original}, snippet }
  → map into WebSearchResult { …, siteName?, hostname?, favicon?, thumbnail?, age? }
  → CitationChip badge + HoverCard  /  SourcesPanel
```

### Main process — `src/main/lib/ai/utils/web-search-util.ts`

- In `fetchBraveLlmContext`, add `params.set('enable_source_metadata', 'true')`.
- Extend `BraveLlmContextSourceMeta`:
  ```ts
  type BraveLlmContextSourceMeta = {
    title?: string
    hostname?: string
    site_name?: string
    favicon?: string
    age?: string[]
    thumbnail?: { src?: string; original?: string }
    snippet?: string
  }
  ```
- In the result-building loop, populate the new `WebSearchResult` fields from
  `llmMeta` (the `sources[src.url]` entry):
  - `siteName = llmMeta?.site_name`
  - `hostname = llmMeta?.hostname`
  - `favicon = llmMeta?.favicon`
  - `thumbnail = llmMeta?.thumbnail?.src ?? llmMeta?.thumbnail?.original`
  - `age = pickAgeLabel(llmMeta?.age)` — a small helper returning a human label:
    prefer an entry containing "ago"/"today"/"yesterday"; else the ISO-date
    entry; else the first; else `undefined`.

### Shared type — `src/shared/types/web-search.ts`

Add optional fields to `WebSearchResult` (all optional — every existing consumer
keeps working):

```ts
export interface WebSearchResult {
  rank: number
  link: string
  title: string
  content: string
  snippet: string
  media?: WebSearchMediaResult[]
  siteName?: string
  hostname?: string
  /** Brave-provided favicon URL (primary; Google API is the fallback). */
  favicon?: string
  /** Source thumbnail URL for the hover card. */
  thumbnail?: string
  /** Human freshness label, e.g. "5 days ago". */
  age?: string
}
```

### Renderer — citation badge + hover card (`src/renderer/components/markdown.tsx`, `CitationChip`)

- **Badge:** favicon image + label. Label = `source.siteName ?? source.hostname ?? source.title`.
  Favicon `<img src={source.favicon}>` with `onError` → swap to
  `faviconUrl(source.link)` (Google). If no Brave favicon, start with the Google
  one. Keep the badge compact (small favicon, truncated label).
- **Hover card:** if `source.thumbnail`, render it at the top with
  `LazyLoadImage` (fixed aspect box). Then: hostname/site name row (with
  favicon), the title (bold, line-clamped), the snippet, and an `age` line
  ("5 days ago") when present. Card remains a link to `source.link`.

### Renderer — Sources panel (`src/renderer/components/sources-panel.tsx`)

Apply the same favicon + site-name + (optional) thumbnail treatment to each
source row so the panel and inline badges look consistent.

## Error handling / edge cases

- **Missing metadata** (Brave omits favicon/thumbnail/age for some sources, e.g.
  the example's `aviso.altimetry.fr` has empty `age` and no thumbnail): every
  new field is optional; the badge falls back to hostname/title and the Google
  favicon; the hover card omits the thumbnail/age blocks.
- **Broken favicon/thumbnail URLs:** `<img onError>` swaps the favicon to
  Google; `LazyLoadImage` already shows an error state for thumbnails.
- **Old persisted results:** lack the fields → same graceful fallback as above.
- **`age` array shape** varies; `pickAgeLabel` is defensive (handles empty/missing).

## Testing

- Unit-test `pickAgeLabel` (relative-preferred, ISO fallback, empty → undefined)
  in `web-search-util` (or a small extracted helper module) — pure function, no
  network.
- Type-level: `WebSearchResult` additions compile across consumers
  (`pnpm typecheck`).
- Manual: a real web search renders favicon+site-name badges; hovering shows the
  thumbnail + age; the Sources panel matches.

## Out of scope / future

- **M2** — inline image gallery + full-screen lightbox (3-thumb row + "+N",
  carousel, source attribution reusing M1's favicon/site name).
- **M3** — YouTube video cards.
