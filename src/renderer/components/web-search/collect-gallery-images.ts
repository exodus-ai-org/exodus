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
