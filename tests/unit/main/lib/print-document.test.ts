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

  it('prints a remote picture as a link to it, never as an <img> the window would fetch', () => {
    const html = printDocument('![alt](https://attacker.example/p.png)')
    expect(html).not.toContain('<img')
    expect(html).toContain('<a href="https://attacker.example/p.png">alt</a>')
    expect(printDocument('![](https://attacker.example/p.png)')).toContain(
      '<a href="https://attacker.example/p.png">https://attacker.example/p.png</a>'
    )
  })

  it('draws only a raster data: picture', () => {
    expect(
      printDocument('![dot](data:image/png;base64,iVBORw0KGgo=)')
    ).toContain('<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot">')
    expect(
      printDocument('![svg](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)')
    ).not.toContain('<img')
  })
})
