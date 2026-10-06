// The composer's two layouts (ChatGPT's): one line and the field sits between
// the buttons; wrapped, it takes the top on its own. The decision is made from
// the field's height at its width beside the buttons.
import { describe, expect, it } from 'vitest'

import {
  COMPOSER_ONE_LINE_HEIGHT,
  compactFieldWidth,
  wrapsPastOneLine
} from '@/components/chat/composer/composer-layout'

describe('the composer field beside the buttons', () => {
  it('is the row less the two buttons and the gap on either side of it', () => {
    expect(
      compactFieldWidth({
        rowWidth: 600,
        leadingWidth: 32,
        trailingWidth: 32,
        gap: 4
      })
    ).toBe(528)
  })

  it('is never negative when the row is narrower than its buttons', () => {
    expect(
      compactFieldWidth({
        rowWidth: 40,
        leadingWidth: 32,
        trailingWidth: 32,
        gap: 4
      })
    ).toBe(0)
  })
})

describe('whether the text has wrapped past one line', () => {
  it('one 24px line in 8px of padding is the 32px row', () => {
    expect(COMPOSER_ONE_LINE_HEIGHT).toBe(32)
  })

  it('a second line expands; a rounding pixel or two does not', () => {
    expect(wrapsPastOneLine(32)).toBe(false)
    expect(wrapsPastOneLine(34)).toBe(false)
    expect(wrapsPastOneLine(35)).toBe(true)
    expect(wrapsPastOneLine(56)).toBe(true)
  })

  it('takes another line height for another font', () => {
    expect(wrapsPastOneLine(40, 40)).toBe(false)
    expect(wrapsPastOneLine(60, 40)).toBe(true)
  })
})
