// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/components/source-favicon', () => ({ SourceFavicon: () => null }))

const { ImageLightbox } = await import('@/components/web-search/image-lightbox')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
})

const images = [
  {
    url: 'https://site.example/original.jpg',
    thumbnailUrl: 'https://imgs.search.brave.com/copy',
    title: 'A picture',
    sourceUrl: 'https://site.example/page'
  }
]

describe('the lightbox', () => {
  // The same loading as the grid (a skeleton, then a fade), and only the copy
  // Brave fetched — never the site's own file (owner, 2026-09-30).
  it('shows the search copy through LazyLoadImage, whole', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        createElement(ImageLightbox, {
          images,
          index: 0,
          onIndexChange: () => {},
          onClose: () => {}
        })
      )
    })

    const img = document.body.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://imgs.search.brave.com/copy')
    expect(img?.className).toContain('object-contain')
    expect(img?.className).not.toContain('object-cover')
    // LazyLoadImage's skeleton, until the image has loaded.
    expect(document.body.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(document.body.innerHTML).not.toContain('original.jpg')
    await act(async () => root.unmount())
  })
})
