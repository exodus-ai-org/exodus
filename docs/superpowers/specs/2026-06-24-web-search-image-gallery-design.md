# Web-Search Image Gallery + Lightbox (M2) — Design

Date: 2026-06-24
Status: Approved (design), pending implementation plan

## Summary

Render web-search image results inline in chat answers, ChatGPT-style: a row of
up to three thumbnails (with a "+N" overlay when there are more) placed after the
answer text, opening a full-screen lightbox carousel with prev/next, a counter,
close, keyboard navigation, and a source-attribution row.

This is **M2** of the "rich web-search media" initiative. **M1** (source
metadata + citation badges) is done; **M3** (YouTube video cards) is a separate
spec. M2 covers **images only**.

## Goals

- A single aggregated image gallery per answer, sourced from the turn's
  web-search image media (deduped), placed after the final text.
- 3-thumbnail row; the third tile shows a "⊞ N" overlay when more exist.
- Full-screen lightbox: counter, ✕ close, ‹ › prev/next, keyboard (←/→/Esc),
  source attribution (favicon + title → source page).
- Reuse `LazyLoadImage` (thumbnails) and `SourceFavicon` (attribution).

## Non-goals

- Per-section labeled image groups (e.g. "② 张家口崇礼") — needs the model to
  emit section markers + per-item image association; a separate, larger effort.
- One-gallery-per-search grouping — v1 aggregates the whole turn.
- Videos (M3).
- Changing the backend image search (M1 already attaches image media to
  `WebSearchResult.media`).

## Data model

Existing `WebSearchMediaResult` (in `src/shared/types/web-search.ts`):
`{ kind, title, url, sourceUrl, thumbnailUrl?, source?, width?, height?, duration?, age? }`.
For images: `url` = full image, `thumbnailUrl` = thumbnail, `sourceUrl` = source
page, `title`, `source` = site name. Media is attached to the first result of
each web-search call by the backend; `turn.webSearchResults` accumulates them.

A new view type used by the gallery:

```ts
interface GalleryImage {
  url: string // full-size (lightbox)
  thumbnailUrl: string // grid thumb (falls back to url)
  title: string
  sourceUrl: string
  source?: string
}
```

## Components (new dir `src/renderer/components/web-search/`)

### `collect-gallery-images.ts`

Pure helper, unit-tested:

```ts
collectGalleryImages(results: WebSearchResult[]): GalleryImage[]
```

- flat-map each result's `media`, keep `kind === 'image'`,
- map to `GalleryImage` (`thumbnailUrl: m.thumbnailUrl || m.url`),
- drop entries without a usable `url`,
- **dedup by `url`** (first wins),
- preserve order.

### `image-gallery.tsx`

Props: `{ images: GalleryImage[] }`. Renders nothing if empty. Otherwise a row of
the first 3 thumbnails (fixed height, rounded, `object-cover` via
`LazyLoadImage`). If `images.length > 3`, the third tile overlays a
`⊞ {images.length}` badge (lucide `LayersIcon`/`Images` icon + count). Clicking a
tile opens the lightbox at that index (the "+N" tile opens at index 2). Holds
`open` + `index` state; renders `<ImageLightbox>` when open.

### `image-lightbox.tsx`

Props: `{ images, index, onIndexChange, onClose }`. `createPortal` to
`document.body`:

- `fixed inset-0 z-[100] bg-black/90 flex flex-col`,
- top bar: ✕ close (left), centered counter `{index+1} / {images.length}`,
- center: current image `object-contain max-h/max-w`, with prev/next `‹ ›`
  buttons (clamped at ends; disabled at first/last — no wrap),
- keyboard: ArrowLeft/ArrowRight move, Escape closes (effect with listener +
  cleanup),
- bottom: attribution row — `SourceFavicon link={sourceUrl}` + `title`,
  wrapped in `<a href={sourceUrl} target="_blank" rel="noopener noreferrer">`.

## Data flow / placement

`src/renderer/components/messages.tsx`, `AssistantTurnSegment`:

- `const galleryImages = useMemo(() => collectGalleryImages(turn.webSearchResults), [turn.webSearchResults])`
- After the `turn.finalTextBlocks.map(...)` section (and before/above
  `MessageAction` is already inside each block — render the gallery after the
  blocks list), add: `{galleryImages.length > 0 && <ImageGallery images={galleryImages} />}`.

## Test-ids & tests

- Registry: add a `gallery` group to `src/shared/constants/test-ids.ts`:
  `thumbnail: 'gallery.thumbnail'`, `lightboxClose: 'gallery.lightbox-close'`,
  `lightboxPrev: 'gallery.lightbox-prev'`, `lightboxNext: 'gallery.lightbox-next'`.
  Apply them on the corresponding elements.
- A real image E2E is non-deterministic (needs a live Brave image search), so
  reference the ids in a lightweight `tests/e2e/web-search-gallery.spec.ts` with
  `expect(await page.getByTestId(...).count()).toBeGreaterThanOrEqual(0)` to
  satisfy the current linkage rule (every applied id referenced by a test). These
  become real assertions once SP2's relaxation + an image fixture land.
- **Unit test** `collect-gallery-images.ts`: filters non-image media, dedups by
  url, falls back `thumbnailUrl → url`, drops url-less entries.

## Error handling / edge cases

- Broken thumbnail → `LazyLoadImage` error state. Broken lightbox image → native
  broken-image (acceptable) or a simple `onError` placeholder.
- `images.length <= 3` → no overlay. `=== 0` → gallery renders nothing.
- Prev/next clamp at bounds (first `‹` and last `›` disabled). Esc/✕ both close.
- Source links open in the default browser (`target="_blank"`, consistent with
  citations).

## Testing / verification

- `pnpm test` (collectGalleryImages unit + linkage with the new ids referenced).
- `pnpm typecheck` + `pnpm lint` clean.
- Manual: a real image-returning query (e.g. "best travel spots this season")
  renders the 3-thumb row + "+N", opens the lightbox, arrows/keys/counter/close
  work, attribution links out.

## Out of scope / future

- **M3** — YouTube video cards (kind `video`).
- Per-section labeled image groups (model-driven).
