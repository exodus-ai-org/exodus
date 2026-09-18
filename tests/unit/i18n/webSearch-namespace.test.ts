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
      'src',
      'shared',
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
})
