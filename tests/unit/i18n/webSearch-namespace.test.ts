import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const webSearch = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'packages',
      'shared',
      'src',
      'i18n',
      'locales',
      'en',
      'webSearch.json'
    ),
    'utf8'
  )
)

describe('webSearch namespace (en)', () => {
  it('has the video card view-count key', () => {
    expect(webSearch.videoCard.views).toBe('{{count}} views')
  })

  it('has the image lightbox keys', () => {
    expect(webSearch.imageLightbox).toMatchObject({
      imageUnavailable: 'Image unavailable',
      previewOnly: 'Showing preview — full image unavailable',
      previousImage: 'Previous image',
      nextImage: 'Next image',
      goToImage: 'Go to image {{index}}'
    })
  })
})
