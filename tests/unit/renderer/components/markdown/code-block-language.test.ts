import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

import { Markdown } from '@/components/markdown/markdown'

const html = (src: string) =>
  renderToStaticMarkup(createElement(Markdown, { src }))

describe('a fenced code block', () => {
  it('with no language is a code block labelled Text, as one with a language is', () => {
    const plain = html('```\n[A] ──▶ [B]\n```')
    const typed = html('```ts\nconst a = 1\n```')
    expect(plain).toContain('Text')
    expect(plain).toContain('action.copy')
    expect(plain).toContain('[A] ──▶ [B]')
    // The same structure: the strip, then the highlighter's div in the mono face.
    const shape = (s: string) =>
      (s.match(/<(section|div|pre)\b/gu) ?? []).join()
    expect(shape(plain)).toBe(shape(typed))
  })

  it('leaves inline code inline', () => {
    const out = html('Run `ls` now')
    expect(out).toContain('<code>ls</code>')
    expect(out).not.toContain('Text')
  })
})
