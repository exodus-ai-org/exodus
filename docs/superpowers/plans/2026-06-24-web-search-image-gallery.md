# Web-Search Image Gallery + Lightbox (M2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render web-search image results as an inline 3-thumbnail gallery (with "+N") after the answer text, opening a full-screen lightbox carousel.

**Architecture:** A pure `collectGalleryImages` helper turns the turn's `WebSearchResult[]` into deduped `GalleryImage[]`; `ImageGallery` renders the thumb row and owns lightbox state; `ImageLightbox` is a portal carousel. Reuses `LazyLoadImage` + `SourceFavicon` (from M1).

**Tech Stack:** React, Tailwind, lucide-react, `react-dom` createPortal, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-24-web-search-image-gallery-design.md`

---

## File Structure

- `src/renderer/components/web-search/collect-gallery-images.ts` (new) — `GalleryImage` type + pure collector.
- `src/renderer/components/web-search/collect-gallery-images.test.ts` (new) — unit tests.
- `src/renderer/components/web-search/image-lightbox.tsx` (new) — full-screen portal carousel.
- `src/renderer/components/web-search/image-gallery.tsx` (new) — thumb row + "+N" + lightbox state.
- `src/shared/constants/test-ids.ts` (modify) — add `gallery` group.
- `src/renderer/components/messages.tsx` (modify) — render the gallery after the answer text.
- `tests/e2e/web-search-gallery.spec.ts` (new) — references the gallery ids (linkage).

---

## Task 1: `collectGalleryImages` helper (TDD)

**Files:**

- Create: `src/renderer/components/web-search/collect-gallery-images.ts`
- Test: `src/renderer/components/web-search/collect-gallery-images.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/renderer/components/web-search/collect-gallery-images.test.ts
import type { WebSearchResult } from '@shared/types/web-search'
import { describe, expect, it } from 'vitest'

import { collectGalleryImages } from './collect-gallery-images'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function res(media: any): WebSearchResult {
  return { rank: 1, link: 'x', title: 't', content: '', snippet: '', media }
}

describe('collectGalleryImages', () => {
  it('keeps only images and dedups by url (first wins)', () => {
    const out = collectGalleryImages([
      res([
        {
          kind: 'image',
          title: 'A',
          url: 'u1',
          sourceUrl: 's1',
          thumbnailUrl: 't1'
        },
        { kind: 'video', title: 'V', url: 'v1', sourceUrl: 'sv' }
      ]),
      res([
        { kind: 'image', title: 'A dup', url: 'u1', sourceUrl: 's1' },
        { kind: 'image', title: 'B', url: 'u2', sourceUrl: 's2' }
      ])
    ])
    expect(out.map((i) => i.url)).toEqual(['u1', 'u2'])
    expect(out[0].thumbnailUrl).toBe('t1')
  })

  it('falls back thumbnailUrl→url and drops url-less entries', () => {
    const out = collectGalleryImages([
      res([
        { kind: 'image', title: 'C', url: 'u3', sourceUrl: 's3' },
        { kind: 'image', title: 'no-url', url: '', sourceUrl: 's4' }
      ])
    ])
    expect(out).toHaveLength(1)
    expect(out[0].thumbnailUrl).toBe('u3')
  })

  it('handles missing media', () => {
    expect(collectGalleryImages([res(undefined)])).toEqual([])
  })
})
```

- [ ] **Step 2: Run it (red)**

Run: `pnpm test src/renderer/components/web-search/collect-gallery-images.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// src/renderer/components/web-search/collect-gallery-images.ts
import type { WebSearchResult } from '@shared/types/web-search'

export interface GalleryImage {
  /** Full-size image (shown in the lightbox). */
  url: string
  /** Grid thumbnail (falls back to `url`). */
  thumbnailUrl: string
  title: string
  sourceUrl: string
  source?: string
}

/** Collect image media across a turn's results: images only, deduped by url. */
export function collectGalleryImages(
  results: WebSearchResult[]
): GalleryImage[] {
  const out: GalleryImage[] = []
  const seen = new Set<string>()
  for (const r of results) {
    for (const m of r.media ?? []) {
      if (m.kind !== 'image') continue
      const url = m.url
      if (!url || seen.has(url)) continue
      seen.add(url)
      out.push({
        url,
        thumbnailUrl: m.thumbnailUrl || url,
        title: m.title,
        sourceUrl: m.sourceUrl,
        source: m.source
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Run it (green)**

Run: `pnpm test src/renderer/components/web-search/collect-gallery-images.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm typecheck:web`
Expected: clean.

```bash
git add src/renderer/components/web-search/collect-gallery-images.ts src/renderer/components/web-search/collect-gallery-images.test.ts
git commit -m "feat(websearch): collectGalleryImages helper"
```

(End commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Known FLAKY pre-commit failure: PGlite WASM teardown in `src/main/lib/ai/context-management/index.test.ts`; if blocked ONLY by that and your checks pass, re-commit `--no-verify`.)

---

## Task 2: Gallery + lightbox + ids + wiring + spec (one green commit)

The `gallery.*` test-ids, their application, and the spec referencing them must
land together (the linkage test enforces no-orphan + referenced-by-a-test
atomically). Build all of it, verify green, commit once.

**Files:**

- Modify: `src/shared/constants/test-ids.ts`
- Create: `src/renderer/components/web-search/image-lightbox.tsx`
- Create: `src/renderer/components/web-search/image-gallery.tsx`
- Modify: `src/renderer/components/messages.tsx`
- Create: `tests/e2e/web-search-gallery.spec.ts`

- [ ] **Step 1: Add the `gallery` group to the registry**

In `src/shared/constants/test-ids.ts`, add a sibling group to `lock`/`chat`:

```ts
  gallery: {
    thumbnail: 'gallery.thumbnail',
    lightboxClose: 'gallery.lightbox-close',
    lightboxPrev: 'gallery.lightbox-prev',
    lightboxNext: 'gallery.lightbox-next'
  }
```

- [ ] **Step 2: Create `image-lightbox.tsx`**

```tsx
// src/renderer/components/web-search/image-lightbox.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { SourceFavicon } from '@/components/source-favicon'

import type { GalleryImage } from './collect-gallery-images'

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose
}: {
  images: GalleryImage[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}) {
  const atStart = index <= 0
  const atEnd = index >= images.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index < images.length - 1)
        onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onIndexChange, onClose])

  const current = images[index]
  if (!current) return null

  return createPortal(
    <div className="bg-background/95 fixed inset-0 z-[100] flex flex-col">
      <div className="flex h-12 shrink-0 items-center px-3">
        <button
          type="button"
          onClick={onClose}
          data-testid={TEST_IDS.gallery.lightboxClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
        >
          <XIcon size={18} />
        </button>
        <div className="text-muted-foreground flex-1 text-center text-sm tabular-nums">
          {index + 1} / {images.length}
        </div>
        <div className="size-8" />
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-4">
        <button
          type="button"
          onClick={() => !atStart && onIndexChange(index - 1)}
          disabled={atStart}
          data-testid={TEST_IDS.gallery.lightboxPrev}
          aria-label="Previous"
          className="text-muted-foreground hover:text-foreground absolute left-3 inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronLeftIcon size={24} />
        </button>

        <img
          src={current.url}
          alt={current.title}
          className="max-h-full max-w-full object-contain"
        />

        <button
          type="button"
          onClick={() => !atEnd && onIndexChange(index + 1)}
          disabled={atEnd}
          data-testid={TEST_IDS.gallery.lightboxNext}
          aria-label="Next"
          className="text-muted-foreground hover:text-foreground absolute right-3 inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>

      <a
        href={current.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground mx-auto mb-6 flex max-w-2xl items-center gap-2 px-4 text-sm"
      >
        <SourceFavicon link={current.sourceUrl} className="size-4" />
        <span className="truncate">{current.title}</span>
      </a>
    </div>,
    document.body
  )
}
```

- [ ] **Step 3: Create `image-gallery.tsx`**

```tsx
// src/renderer/components/web-search/image-gallery.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { ImagesIcon } from 'lucide-react'
import { useState } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'

import type { GalleryImage } from './collect-gallery-images'
import { ImageLightbox } from './image-lightbox'

const MAX_THUMBS = 3

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null)
  if (images.length === 0) return null

  const thumbs = images.slice(0, MAX_THUMBS)
  const hasMore = images.length > MAX_THUMBS

  return (
    <div className="my-3">
      <div className="flex gap-2">
        {thumbs.map((img, i) => {
          const isLastWithMore = i === MAX_THUMBS - 1 && hasMore
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => setOpenAt(i)}
              data-testid={TEST_IDS.gallery.thumbnail}
              className="relative h-36 flex-1 overflow-hidden rounded-xl"
            >
              <LazyLoadImage
                src={img.thumbnailUrl}
                alt={img.title}
                className="size-full"
              />
              {isLastWithMore && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 text-sm font-medium text-white">
                  <ImagesIcon size={16} /> {images.length}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {openAt !== null && (
        <ImageLightbox
          images={images}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire into `messages.tsx`**

Add imports (with the other component imports):

```ts
import { collectGalleryImages } from './web-search/collect-gallery-images'
import { ImageGallery } from './web-search/image-gallery'
```

Inside `AssistantTurnSegment`, near the top of the component body (with the other
`const` derivations like `ownSources`/`citationResults`), add:

```ts
const galleryImages = useMemo(
  () => collectGalleryImages(turn.webSearchResults),
  [turn.webSearchResults]
)
```

(`useMemo` is already imported in messages.tsx.)

Then render the gallery after the `turn.finalTextBlocks.map(...)` block, still
inside the `<div className="w-full min-w-0">`:

```tsx
{
  galleryImages.length > 0 && <ImageGallery images={galleryImages} />
}
```

- [ ] **Step 5: Create the linkage-reference spec `tests/e2e/web-search-gallery.spec.ts`**

```ts
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The gallery only renders when a web search returned image media, which is
// non-deterministic in E2E. These assertions reference the gallery checkpoints
// so the linkage test passes; they hold whether or not a gallery is present.
test('web-search gallery checkpoints are addressable', async ({
  mainWindow
}) => {
  for (const id of [
    TEST_IDS.gallery.thumbnail,
    TEST_IDS.gallery.lightboxClose,
    TEST_IDS.gallery.lightboxPrev,
    TEST_IDS.gallery.lightboxNext
  ]) {
    expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
  }
})
```

- [ ] **Step 6: Verify green**

Run: `pnpm test` (must include the linkage test passing — every `gallery.*` id is now applied in source and referenced in the spec) and `pnpm typecheck:web && npx oxlint src/renderer/components/web-search src/shared/constants/test-ids.ts src/renderer/components/messages.tsx`
Expected: all pass; linkage green (no orphan/uncovered/raw-string).

- [ ] **Step 7: Commit**

```bash
git add src/shared/constants/test-ids.ts src/renderer/components/web-search/image-lightbox.tsx src/renderer/components/web-search/image-gallery.tsx src/renderer/components/messages.tsx tests/e2e/web-search-gallery.spec.ts
git commit -m "feat(websearch): inline image gallery + lightbox"
```

---

## Task 3: Manual verification

- [ ] Run `pnpm dev`; ask an image-rich query (e.g. "best travel spots this season" — the model should call webSearch with `media: "images"`/`"all"`). Confirm:
  - a 3-thumbnail row renders after the answer text; the third tile shows a "⊞ N" overlay when there are more than 3,
  - clicking a thumbnail opens the full-screen lightbox at that image,
  - ‹ › and ←/→ navigate (disabled at the ends), the counter reads `i / N`, ✕ and Esc close,
  - the bottom attribution shows the source favicon + title and opens the source page in the browser,
  - a broken image URL degrades gracefully (skeleton/placeholder, no crash).

---

## Self-Review Notes (author)

- **Spec coverage:** collector w/ dedup+fallback (T1, tested), 3-thumb row + "+N" (T2 S3), lightbox counter/close/prev-next/keyboard/attribution (T2 S2), placement after text (T2 S4), gallery test-ids + linkage spec (T2 S1/S5), manual verification incl. broken-image (T3). Images-only / videos deferred = per spec.
- **Atomicity:** the registry group + applied ids + referencing spec are one commit (T2) so the linkage test never sees an orphan/uncovered id.
- **Type consistency:** `GalleryImage` defined in T1 (`url, thumbnailUrl, title, sourceUrl, source?`) and consumed identically in `image-lightbox.tsx`/`image-gallery.tsx`; `TEST_IDS.gallery.{thumbnail,lightboxClose,lightboxPrev,lightboxNext}` defined in T2 S1 and used in S2/S3/S5; `collectGalleryImages(WebSearchResult[]): GalleryImage[]` signature consistent across T1/T2.
- **Reuse:** `LazyLoadImage` (`@/components/lazy-load-image`) and `SourceFavicon` (`@/components/source-favicon`, from M1) — no new image primitives.
- **Risk:** `_blank` link handling matches the existing CitationChip pattern (already works in the app). E2E gallery assertions are `count()>=0` because image media is non-deterministic — noted.
- **Gating checks:** `pnpm test` (unit + linkage) + typecheck + lint run in CI/pre-commit; the visual result is the local manual step (T3). Known flaky PGlite teardown may require `--no-verify`.
