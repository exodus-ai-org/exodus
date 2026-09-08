import { describe, expect, it } from 'vitest'

import { isDrawioOutput } from '@/components/calling-tools/drawio/drawio-card'

describe('isDrawioOutput', () => {
  it('accepts a `_version`-tagged payload outright', () => {
    expect(
      isDrawioOutput({ mermaid: 'anything', _version: 'drawio-mcp-2026-05-06' })
    ).toBe(true)
    expect(isDrawioOutput({ xml: '<x/>', _version: 'drawio-app-2026' })).toBe(
      true
    )
  })

  it('accepts a bare {mermaid} payload when the source sniffs as mermaid', () => {
    expect(isDrawioOutput({ mermaid: 'graph TD\n  A --> B' })).toBe(true)
    expect(
      isDrawioOutput({ mermaid: 'flowchart LR\n  X["台积电"] --> Y' })
    ).toBe(true)
    expect(
      isDrawioOutput({
        mermaid: '%%{init: {"theme":"dark"}}%%\nsequenceDiagram\n  A->>B: hi'
      })
    ).toBe(true)
  })

  it('accepts a bare {xml} payload when it looks like draw.io xml', () => {
    expect(
      isDrawioOutput({ xml: '<mxGraphModel><root/></mxGraphModel>' })
    ).toBe(true)
    expect(isDrawioOutput({ xml: '<mxfile><diagram/></mxfile>' })).toBe(true)
  })

  it('rejects non-diagram objects and unversioned ambiguous payloads', () => {
    expect(isDrawioOutput(null)).toBe(false)
    expect(isDrawioOutput('graph TD\n A-->B')).toBe(false) // must be an object
    expect(isDrawioOutput({ result: 'ok' })).toBe(false)
    expect(isDrawioOutput({ mermaid: 'not a diagram, just prose' })).toBe(false)
    expect(isDrawioOutput({ csv: 'a,b\n1,2' })).toBe(false) // csv alone is ambiguous
    expect(isDrawioOutput({ xml: '<note>hi</note>' })).toBe(false)
  })
})
