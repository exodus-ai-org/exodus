import { printDocument } from '@main/lib/pdf/print-document'
import { describe, expect, it } from 'vitest'

describe('printDocument', () => {
  it('is a whole page: the Markdown as HTML under a print stylesheet', () => {
    const html = printDocument(
      '# Title\n\nSome `code` and\n\n```ts\nlet a = 1\n```\n'
    )
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<style>')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain(
      '<pre><code class="language-ts">let a = 1\n</code></pre>'
    )
  })

  it("keeps the model's HTML inert: it is text, not markup", () => {
    const html = printDocument('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
