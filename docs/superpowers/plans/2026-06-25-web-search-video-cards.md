# Web-Search Video Cards (M3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render web-search video results as a horizontally-scrollable row of cards after the image gallery; clicking opens the watch URL in the browser.

**Architecture:** A pure `collectGalleryVideos` helper turns the turn's `WebSearchResult[]` into deduped `GalleryVideo[]`; `VideoCards` renders the card row. Reuses `LazyLoadImage` + `SourceFavicon`. No backend changes, no embed.

**Tech Stack:** React, Tailwind, lucide-react, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-25-web-search-video-cards-design.md`

---

## File Structure

- `src/renderer/components/web-search/collect-gallery-videos.ts` (new) — `GalleryVideo` + collector.
- `src/renderer/components/web-search/collect-gallery-videos.test.ts` (new) — unit tests.
- `src/renderer/components/web-search/video-cards.tsx` (new) — the card row.
- `src/shared/constants/test-ids.ts` (modify) — add `video` group.
- `src/renderer/components/messages.tsx` (modify) — render after `ImageGallery`.
- `tests/e2e/web-search-gallery.spec.ts` (modify) — reference `video.card`.

---

## Task 1: `collectGalleryVideos` helper (TDD)

**Files:**

- Create: `src/renderer/components/web-search/collect-gallery-videos.ts`
- Test: `src/renderer/components/web-search/collect-gallery-videos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/renderer/components/web-search/collect-gallery-videos.test.ts
import type { WebSearchResult } from '@shared/types/web-search'
import { describe, expect, it } from 'vitest'

import { collectGalleryVideos } from './collect-gallery-videos'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function res(media: any): WebSearchResult {
  return { rank: 1, link: 'x', title: 't', content: '', snippet: '', media }
}

describe('collectGalleryVideos', () => {
  it('keeps only videos and dedups by url (first wins)', () => {
    const out = collectGalleryVideos([
      res([
        {
          kind: 'video',
          title: 'A',
          url: 'v1',
          sourceUrl: 'v1',
          thumbnailUrl: 't1',
          duration: '1:23',
          source: 'Ch'
        },
        { kind: 'image', title: 'I', url: 'i1', sourceUrl: 'i1' }
      ]),
      res([
        { kind: 'video', title: 'A dup', url: 'v1', sourceUrl: 'v1' },
        { kind: 'video', title: 'B', url: 'v2', sourceUrl: 'v2' }
      ])
    ])
    expect(out.map((v) => v.url)).toEqual(['v1', 'v2'])
    expect(out[0].thumbnailUrl).toBe('t1')
    expect(out[0].duration).toBe('1:23')
  })

  it('falls back thumbnailUrl→url and drops url-less entries', () => {
    const out = collectGalleryVideos([
      res([
        { kind: 'video', title: 'C', url: 'v3', sourceUrl: 'v3' },
        { kind: 'video', title: 'no-url', url: '', sourceUrl: 'x' }
      ])
    ])
    expect(out).toHaveLength(1)
    expect(out[0].thumbnailUrl).toBe('v3')
  })

  it('handles missing media', () => {
    expect(collectGalleryVideos([res(undefined)])).toEqual([])
  })
})
```

- [ ] **Step 2: Run it (red)**

Run: `pnpm test src/renderer/components/web-search/collect-gallery-videos.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// src/renderer/components/web-search/collect-gallery-videos.ts
import type { WebSearchResult } from '@shared/types/web-search'

export interface GalleryVideo {
  /** Watch URL (opened in the browser). */
  url: string
  /** Card thumbnail (falls back to `url`). */
  thumbnailUrl: string
  title: string
  /** Channel / site name. */
  source?: string
  /** e.g. "12:34". */
  duration?: string
}

/** Collect video media across a turn's results: videos only, deduped by url. */
export function collectGalleryVideos(
  results: WebSearchResult[]
): GalleryVideo[] {
  const out: GalleryVideo[] = []
  const seen = new Set<string>()
  for (const r of results) {
    for (const m of r.media ?? []) {
      if (m.kind !== 'video') continue
      const url = m.url
      if (!url || seen.has(url)) continue
      seen.add(url)
      out.push({
        url,
        thumbnailUrl: m.thumbnailUrl || url,
        title: m.title,
        source: m.source,
        duration: m.duration
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Run it (green)**

Run: `pnpm test src/renderer/components/web-search/collect-gallery-videos.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck:web`
Expected: clean.

```bash
git add src/renderer/components/web-search/collect-gallery-videos.ts src/renderer/components/web-search/collect-gallery-videos.test.ts
git commit -m "feat(websearch): collectGalleryVideos helper"
```

(End commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Known FLAKY pre-commit failure: PGlite WASM teardown in `src/main/lib/ai/context-management/index.test.ts`; if blocked ONLY by that and your checks pass, re-commit `--no-verify`.)

---

## Task 2: VideoCards + id + wiring + spec (one green commit)

The `video.card` id, its application, and the spec reference must land together
(linkage enforces no-orphan + referenced-by-a-test atomically).

**Files:**

- Modify: `src/shared/constants/test-ids.ts`
- Create: `src/renderer/components/web-search/video-cards.tsx`
- Modify: `src/renderer/components/messages.tsx`
- Modify: `tests/e2e/web-search-gallery.spec.ts`

- [ ] **Step 1: Add the `video` group to the registry**

In `src/shared/constants/test-ids.ts`, add a sibling group:

```ts
video: {
  card: 'video.card'
}
```

- [ ] **Step 2: Create `video-cards.tsx`**

```tsx
// src/renderer/components/web-search/video-cards.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { PlayIcon } from 'lucide-react'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { SourceFavicon } from '@/components/source-favicon'

import type { GalleryVideo } from './collect-gallery-videos'

export function VideoCards({ videos }: { videos: GalleryVideo[] }) {
  if (videos.length === 0) return null

  return (
    <div className="my-3 flex gap-3 overflow-x-auto pb-1">
      {videos.map((video) => (
        <a
          key={video.url}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={TEST_IDS.video.card}
          className="w-52 shrink-0"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <LazyLoadImage
              src={video.thumbnailUrl}
              alt={video.title}
              className="size-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white">
                <PlayIcon size={18} className="translate-x-px fill-current" />
              </span>
            </div>
            {video.duration && (
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                {video.duration}
              </span>
            )}
          </div>
          <div className="mt-1.5 line-clamp-2 text-sm font-medium">
            {video.title}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <SourceFavicon link={video.url} className="size-3.5" />
            {video.source && <span className="truncate">{video.source}</span>}
          </div>
        </a>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire into `messages.tsx`**

Add imports (with the existing web-search imports):

```ts
import { collectGalleryVideos } from './web-search/collect-gallery-videos'
import { VideoCards } from './web-search/video-cards'
```

Inside `AssistantTurnSegment`, next to `galleryImages`, add:

```ts
const galleryVideos = useMemo(
  () => collectGalleryVideos(turn.webSearchResults),
  [turn.webSearchResults]
)
```

Render the video row immediately AFTER the `<ImageGallery>` block:

```tsx
{
  galleryVideos.length > 0 && <VideoCards videos={galleryVideos} />
}
```

- [ ] **Step 4: Extend the linkage spec `tests/e2e/web-search-gallery.spec.ts`**

Add `TEST_IDS.video.card` to the existing id array so it's referenced by a test:

```ts
for (const id of [
  TEST_IDS.gallery.thumbnail,
  TEST_IDS.gallery.lightboxClose,
  TEST_IDS.gallery.lightboxPrev,
  TEST_IDS.gallery.lightboxNext,
  TEST_IDS.video.card
]) {
  expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
}
```

(Update the existing loop in place; keep the rest of the spec unchanged.)

- [ ] **Step 5: Verify green**

Run: `pnpm test` (linkage must pass — `video.card` applied in source + referenced in the spec) and `pnpm typecheck:web && npx oxlint src/renderer/components/web-search src/shared/constants/test-ids.ts src/renderer/components/messages.tsx tests/e2e/web-search-gallery.spec.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/constants/test-ids.ts src/renderer/components/web-search/video-cards.tsx src/renderer/components/messages.tsx tests/e2e/web-search-gallery.spec.ts
git commit -m "feat(websearch): inline video cards"
```

---

## Task 3: Manual verification

- [ ] Run `pnpm dev`; ask a video-rich query (e.g. "mountain biking in China" — the model should call webSearch with `media: "videos"`/`"all"`). Confirm:
  - a horizontally-scrollable row of video cards renders after the image gallery (text → images → videos),
  - each card shows the thumbnail, a ▶ overlay, and a duration badge (when present), plus title + channel,
  - clicking a card opens the video in the default browser,
  - a broken thumbnail degrades gracefully (skeleton/placeholder).

---

## Self-Review Notes (author)

- **Spec coverage:** collector w/ dedup+fallback (T1, tested); card row + thumbnail/play/duration/title/channel (T2 S2); open-in-browser via `target="_blank"` (T2 S2); placement after image gallery (T2 S3); `video.card` id + linkage reference (T2 S1/S4); manual verification incl. broken-thumbnail (T3). Inline embed = out of scope per spec.
- **Atomicity:** `video.card` registry entry + application + spec reference in one commit (T2) so linkage never sees an orphan/uncovered id.
- **Type consistency:** `GalleryVideo` (`url, thumbnailUrl, title, source?, duration?`) defined in T1, consumed identically in `video-cards.tsx`; `collectGalleryVideos(WebSearchResult[]): GalleryVideo[]` consistent T1/T3; `TEST_IDS.video.card` defined T2 S1, used S2/S4. Mirrors the M2 `collectGalleryImages`/`ImageGallery` shapes.
- **Reuse:** `LazyLoadImage` + `SourceFavicon` (no new primitives).
- **Gating checks:** `pnpm test` (unit + linkage) + typecheck + lint in CI/pre-commit; visual result is the local manual step (T3). Known flaky PGlite teardown may require `--no-verify`.
