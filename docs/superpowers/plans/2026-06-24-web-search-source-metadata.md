# Web-Search Source Metadata + Citation Badge (M1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich web-search citations with Brave source metadata — favicon + site name on the badge, source thumbnail + freshness in the hover card and Sources panel.

**Architecture:** Request `enable_source_metadata=true` on `/llm/context`, thread `site_name/favicon/hostname/age/thumbnail` through the additive optional fields of `WebSearchResult`, and render them via a shared `SourceFavicon` (Brave-first, Google-fallback) + `LazyLoadImage`.

**Tech Stack:** TypeScript, Vitest, React, Tailwind, Brave Search API.

**Spec:** `docs/superpowers/specs/2026-06-24-web-search-source-metadata-design.md`

---

## File Structure

- `src/shared/types/web-search.ts` (modify) — add optional metadata fields.
- `src/main/lib/ai/utils/web-search-util.ts` (modify) — `enable_source_metadata` param, extend `BraveLlmContextSourceMeta`, `pickAgeLabel`, map fields.
- `src/main/lib/ai/utils/web-search-util.test.ts` (new) — `pickAgeLabel` unit tests.
- `src/renderer/components/source-favicon.tsx` (new) — Brave-first / Google-fallback favicon.
- `src/renderer/components/markdown.tsx` (modify) — `CitationChip` badge + hover card.
- `src/renderer/components/sources-panel.tsx` (modify) — `SourceLink` parity.

---

## Task 1: Add optional metadata fields to WebSearchResult

**Files:**

- Modify: `src/shared/types/web-search.ts`

- [ ] **Step 1: Extend the interface**

Replace the `WebSearchResult` interface with:

```ts
export interface WebSearchResult {
  rank: number
  link: string
  title: string
  content: string
  snippet: string
  media?: WebSearchMediaResult[]
  /** Brave source metadata (enable_source_metadata). All optional. */
  siteName?: string
  hostname?: string
  /** Brave-provided favicon URL (primary; Google API is the fallback). */
  favicon?: string
  /** Source thumbnail URL for the hover card / panel. */
  thumbnail?: string
  /** Human freshness label, e.g. "5 days ago". */
  age?: string
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck`
Expected: clean (fields are optional; no consumer breaks).

```bash
git add src/shared/types/web-search.ts
git commit -m "feat(websearch): optional source-metadata fields on WebSearchResult"
```

(End commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. The pre-commit hook runs the full Vitest suite, which has a KNOWN FLAKY PGlite WASM teardown in `src/main/lib/ai/context-management/index.test.ts`; if a commit is blocked ONLY by that and your own checks pass, re-commit with `--no-verify`.)

---

## Task 2: Backend — request metadata + map it (TDD on the age helper)

**Files:**

- Modify: `src/main/lib/ai/utils/web-search-util.ts`
- Test: `src/main/lib/ai/utils/web-search-util.test.ts`

- [ ] **Step 1: Write the failing test for `pickAgeLabel`**

```ts
// src/main/lib/ai/utils/web-search-util.test.ts
import { describe, expect, it } from 'vitest'

import { pickAgeLabel } from './web-search-util'

describe('pickAgeLabel', () => {
  it('prefers a relative label', () => {
    expect(
      pickAgeLabel(['Thursday, June 18, 2026', '2026-06-18', '5 days ago'])
    ).toBe('5 days ago')
  })

  it('falls back to the ISO date when no relative label', () => {
    expect(pickAgeLabel(['Monday, October 23, 2023', '2023-10-23'])).toBe(
      '2023-10-23'
    )
  })

  it('returns undefined for empty/missing input', () => {
    expect(pickAgeLabel([])).toBeUndefined()
    expect(pickAgeLabel(undefined)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it — confirm RED**

Run: `pnpm test src/main/lib/ai/utils/web-search-util.test.ts`
Expected: FAIL — `pickAgeLabel` not exported.

> If the import fails because `web-search-util.ts` transitively pulls in
> `electron`/`pglite`, mock them at the top of the test (`vi.mock('electron', …)`)
> or, if that's messy, move `pickAgeLabel` into its own file
> `src/main/lib/ai/utils/age-label.ts` and import from there in both the util and
> the test. Prefer the in-place export; only extract if the import is dirty.

- [ ] **Step 3: Add `pickAgeLabel` and the metadata wiring**

In `src/main/lib/ai/utils/web-search-util.ts`:

(a) Export the helper (near the other helpers):

```ts
/**
 * Pick a human freshness label from Brave's `age` array, e.g.
 * `["Thursday, June 18, 2026", "2026-06-18", "5 days ago"]` → "5 days ago".
 * Prefers a relative phrase; falls back to the ISO date; else the last/first
 * entry; `undefined` when absent.
 */
export function pickAgeLabel(age?: string[]): string | undefined {
  if (!age || age.length === 0) return undefined
  const relative = age.find((a) => /\bago\b|^today$|^yesterday$/i.test(a))
  if (relative) return relative
  const iso = age.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
  return iso ?? age[age.length - 1] ?? age[0]
}
```

(b) Extend the `BraveLlmContextSourceMeta` type:

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

(c) In `fetchBraveLlmContext`, after the existing
`params.set('maximum_number_of_tokens_per_url', '8192')`, add:

```ts
// Enrich each source with site metadata (favicon, site_name, thumbnail, age).
params.set('enable_source_metadata', 'true')
```

(d) In the result-building loop, replace the `results.push({ … })` for grounding
sources with:

```ts
results.push({
  rank: baseRank + results.length + 1,
  link: src.url,
  title,
  snippet: content.slice(0, 300),
  content,
  siteName: llmMeta?.site_name,
  hostname: llmMeta?.hostname,
  favicon: llmMeta?.favicon,
  thumbnail: llmMeta?.thumbnail?.src ?? llmMeta?.thumbnail?.original,
  age: pickAgeLabel(llmMeta?.age)
})
```

(`llmMeta` is the existing `llmCtxOnly?.sources?.[src.url]` lookup already in the loop.)

- [ ] **Step 4: Run the test — GREEN**

Run: `pnpm test src/main/lib/ai/utils/web-search-util.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck:node`
Expected: clean.

```bash
git add src/main/lib/ai/utils/web-search-util.ts src/main/lib/ai/utils/web-search-util.test.ts
git commit -m "feat(websearch): request + map Brave source metadata"
```

---

## Task 3: Shared `SourceFavicon` component (Brave-first, Google-fallback)

**Files:**

- Create: `src/renderer/components/source-favicon.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/renderer/components/source-favicon.tsx
import { faviconUrl } from '@shared/constants/external-urls'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Favicon that prefers the Brave-provided URL and falls back to the Google
 * favicon API on error (or when no Brave favicon is available).
 */
export function SourceFavicon({
  link,
  favicon,
  className
}: {
  link: string
  favicon?: string
  className?: string
}) {
  const googleFallback = (() => {
    try {
      return faviconUrl(new URL(link).origin)
    } catch {
      return faviconUrl(link)
    }
  })()
  const [src, setSrc] = useState(favicon || googleFallback)
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn('size-4 shrink-0 rounded-sm', className)}
      onError={() => {
        if (src !== googleFallback) setSrc(googleFallback)
      }}
    />
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `pnpm typecheck:web && npx oxlint src/renderer/components/source-favicon.tsx`
Expected: clean.

```bash
git add src/renderer/components/source-favicon.tsx
git commit -m "feat(websearch): SourceFavicon with Brave→Google fallback"
```

---

## Task 4: Citation badge + hover card (`CitationChip`)

**Files:**

- Modify: `src/renderer/components/markdown.tsx`

- [ ] **Step 1: Update imports**

In `src/renderer/components/markdown.tsx`: remove the `faviconUrl` import (now
encapsulated in `SourceFavicon`) and add:

```ts
import { LazyLoadImage } from './lazy-load-image'
import { SourceFavicon } from './source-favicon'
```

(Keep the existing `Badge`, `HoverCard*` imports.)

- [ ] **Step 2: Replace the `CitationChip` component**

Replace the entire `CitationChip` definition with:

```tsx
const CitationChip = memo(function CitationChip({
  source
}: {
  source: WebSearchResult
}) {
  let hostname = source.hostname ?? ''
  if (!hostname) {
    try {
      hostname = new URL(source.link).hostname
    } catch {
      hostname = source.link
    }
  }
  const label = source.siteName || hostname || source.title

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <a
            href={source.link}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline hover:no-underline"
          />
        }
      >
        <Badge variant="secondary" className="ml-1 gap-1">
          <SourceFavicon
            link={source.link}
            favicon={source.favicon}
            className="size-3.5"
          />
          <span className="max-w-28 truncate">{label}</span>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        className="w-72 overflow-hidden rounded-xl border p-0 shadow-lg"
      >
        <a href={source.link} target="_blank" rel="noopener noreferrer">
          {source.thumbnail && (
            <LazyLoadImage
              src={source.thumbnail}
              alt={source.title}
              className="h-32 w-full"
            />
          )}
          <div className="flex flex-col gap-1 p-3">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <SourceFavicon
                link={source.link}
                favicon={source.favicon}
                className="size-3"
              />
              <span className="truncate">{source.siteName || hostname}</span>
              {source.age && <span className="shrink-0">· {source.age}</span>}
            </div>
            <div className="line-clamp-2 text-sm leading-snug font-semibold">
              {source.title}
            </div>
            {source.snippet && (
              <div className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                {source.snippet}
              </div>
            )}
          </div>
        </a>
      </HoverCardContent>
    </HoverCard>
  )
})
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm typecheck:web && npx oxlint src/renderer/components/markdown.tsx`
Expected: clean. (If oxlint flags an unused `faviconUrl` import you missed, remove it.)

```bash
git add src/renderer/components/markdown.tsx
git commit -m "feat(websearch): favicon + site-name citation badge with thumbnail card"
```

---

## Task 5: Sources panel parity (`SourceLink`)

**Files:**

- Modify: `src/renderer/components/sources-panel.tsx`

- [ ] **Step 1: Update imports**

Remove the `faviconUrl` import and the `Avatar*` import (no longer used); add:

```ts
import { LazyLoadImage } from './lazy-load-image'
import { SourceFavicon } from './source-favicon'
```

- [ ] **Step 2: Replace `SourceLink`**

```tsx
function SourceLink({ item }: { item: WebSearchResult }) {
  let hostname = item.hostname ?? ''
  if (!hostname) {
    try {
      hostname = new URL(item.link).hostname
    } catch {
      hostname = item.link
    }
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-accent flex gap-3 rounded-lg px-3 py-2"
    >
      {item.thumbnail && (
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md">
          <LazyLoadImage
            src={item.thumbnail}
            alt={item.title}
            className="size-full"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm leading-snug font-semibold">
          {item.title}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <SourceFavicon
            link={item.link}
            favicon={item.favicon}
            className="size-3.5"
          />
          <span className="truncate">{item.siteName || hostname}</span>
          {item.age && <span className="shrink-0">· {item.age}</span>}
        </div>
        {item.snippet && (
          <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">
            {item.snippet}
          </div>
        )}
      </div>
    </a>
  )
}
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `pnpm typecheck:web && npx oxlint src/renderer/components/sources-panel.tsx`
Expected: clean.

```bash
git add src/renderer/components/sources-panel.tsx
git commit -m "feat(websearch): Sources panel favicon/site-name/thumbnail parity"
```

---

## Task 6: Manual verification

- [ ] Run `pnpm dev`, ask something that triggers web search (e.g. "best travel spots this season"), and confirm:
  - citation badges show **favicon + site name** (not the raw title),
  - a source with no Brave favicon still shows the Google favicon (fallback),
  - hovering a badge shows the **thumbnail** (when present) + **age** ("N days ago"),
  - the **Sources** panel rows match (favicon, site name, thumbnail, age).
- [ ] Confirm an older chat (results saved before this change) still renders (graceful fallback to title + Google favicon, no thumbnail/age).

---

## Self-Review Notes (author)

- **Spec coverage:** enable_source_metadata + meta type (T2), WebSearchResult fields (T1), pickAgeLabel + mapping (T2, tested), badge favicon+site_name (T4), favicon Brave→Google fallback (T3), hover-card thumbnail+age (T4), Sources-panel parity (T5), graceful fallbacks (optional fields + onError + LazyLoadImage error state), manual verification (T6).
- **Type consistency:** `WebSearchResult.{siteName,hostname,favicon,thumbnail,age}` defined in T1 and consumed identically in T2/T4/T5; `pickAgeLabel(age?: string[])` defined and used in T2; `SourceFavicon({link,favicon,className})` defined in T3 and called the same way in T4/T5; `thumbnail` is a string (`thumbnail.src ?? thumbnail.original` flattened in T2).
- **No placeholders:** every code step is complete.
- **Risk:** `pickAgeLabel` test import may transitively load electron/pglite via `web-search-util.ts` — T2 Step 2 notes the mock-or-extract fallback.
- **Gating checks:** `pnpm typecheck` + the `pickAgeLabel` unit test run in CI/pre-commit; the visual result is a local manual step (T6). Known flaky PGlite teardown may require `--no-verify`.
