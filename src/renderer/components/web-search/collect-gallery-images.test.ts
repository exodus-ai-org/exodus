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
