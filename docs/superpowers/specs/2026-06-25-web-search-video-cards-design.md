# Web-Search Video Cards (M3) — Design

Date: 2026-06-25
Status: Approved (design), pending implementation plan

## Summary

Render web-search video results (mostly YouTube) as a horizontally-scrollable
row of cards after the answer text (below the image gallery). Each card shows a
16:9 thumbnail with a play overlay + duration badge, the title, and the
channel/source; clicking opens the watch URL in the system browser.

This is **M3** of the "rich web-search media" initiative. **M1** (source
metadata) and **M2** (image gallery + lightbox) are done. M3 covers videos.

## Goals

- A single row of video cards per answer, from the turn's video media (deduped),
  placed after the image gallery.
- Card = 16:9 thumbnail + centered ▶ overlay + duration badge (when present) +
  title (2-line) + channel row (favicon + source).
- Click opens the video's watch URL in the default browser (no inline embed).
- Reuse `LazyLoadImage` + `SourceFavicon`.

## Non-goals

- Inline / lightbox YouTube embed (CSP/iframe complexity) — out of scope; cards
  open in the browser.
- Backend changes — video media is already attached to `WebSearchResult.media`
  by `videoResultsToMedia` (`kind: 'video'`, `url`=`sourceUrl`=watch URL,
  `thumbnailUrl`, `duration`, `source`, `title`).
- Per-section grouping.

## Data model

A view type for the cards:
```ts
interface GalleryVideo {
  url: string // watch URL (opened in browser)
  thumbnailUrl: string // falls back to url
  title: string
  source?: string // channel / site name
  duration?: string // e.g. "12:34"
}
```

## Components (`src/renderer/components/web-search/`)

### `collect-gallery-videos.ts`
Pure helper, unit-tested — parallel to `collectGalleryImages`:
```ts
collectGalleryVideos(results: WebSearchResult[]): GalleryVideo[]
```
- flat-map each result's `media`, keep `kind === 'video'`,
- drop entries without `url`, **dedup by `url`** (first wins),
- `thumbnailUrl: m.thumbnailUrl || m.url`, carry `title/source/duration`,
- preserve order.

### `video-cards.tsx`
Props: `{ videos: GalleryVideo[] }`. Renders nothing if empty. A
horizontally-scrollable row (`flex gap-3 overflow-x-auto`) of fixed-width cards
(~`w-52`). Each card is an
`<a href={video.url} target="_blank" rel="noopener noreferrer">`:
- a 16:9 box (`aspect-video`, rounded, relative) with `LazyLoadImage`
  (`thumbnailUrl`), a centered play overlay (circle + lucide `PlayIcon` on a
  subtle scrim), and a duration badge bottom-right (`bg-black/70 text-white`)
  when `duration` is set,
- title below, `line-clamp-2 text-sm font-medium`,
- channel row: `SourceFavicon link={video.url}` + `source` (truncated, muted).

## Data flow / placement

`src/renderer/components/messages.tsx`, `AssistantTurnSegment`:
- `const galleryVideos = useMemo(() => collectGalleryVideos(turn.webSearchResults), [turn.webSearchResults])`
- Render `{galleryVideos.length > 0 && <VideoCards videos={galleryVideos} />}`
  **after** the `<ImageGallery>` block (text → images → videos), inside the same
  `<div className="w-full min-w-0">`.

## Test-ids & tests

- Registry: add `video: { card: 'video.card' }` to
  `src/shared/constants/test-ids.ts`; apply `data-testid={TEST_IDS.video.card}`
  on each card.
- Reference it by **extending** `tests/e2e/web-search-gallery.spec.ts`'s id loop
  with `TEST_IDS.video.card` (`count() >= 0`) — keeps the linkage test green
  without a new spec. Registry id + application + reference land in one commit.
- **Unit test** `collect-gallery-videos.ts`: filters non-video media, dedups by
  url, `thumbnailUrl → url` fallback, drops url-less entries.

## Error handling / edge cases

- Broken thumbnail → `LazyLoadImage` error state.
- Missing `duration` → no badge; missing `source` → channel row shows favicon
  only (or hostname).
- Empty → renders nothing.
- Links open in the default browser (`target="_blank"`, consistent with
  citations + image attribution).

## Testing / verification

- `pnpm test` (collectGalleryVideos unit + linkage with `video.card` referenced).
- `pnpm typecheck` + `pnpm lint` clean.
- Manual: a video-rich query (e.g. "mountain biking in China") renders a card
  row; clicking opens YouTube in the browser; duration badge + channel show;
  broken thumbnail degrades gracefully.

## Out of scope / future

- Inline YouTube embed / in-app player.
- Per-section grouping of media.
