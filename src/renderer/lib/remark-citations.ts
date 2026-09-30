// The 【N-source】 markers of an answer become nodes of their own here, in
// the syntax tree, so a marker is a citation wherever the model wrote it —
// in bold, in a heading, in the text of a link — and not only in the plain
// text of a paragraph. Code is not text to the parser, so a marker typed in
// code stays as typed.
import { splitMarkers } from './citation-chips'

interface Node {
  type: string
  value?: string
  children?: Node[]
  data?: Record<string, unknown>
}

/** The element a place cited is drawn as (`citationComponents`). */
export const CITATION_ELEMENT = 'cite-chip'

function rewrite(parent: Node): void {
  if (!parent.children) return
  parent.children = parent.children.flatMap((child): Node[] => {
    if (child.type !== 'text' || !child.value?.includes('-source】')) {
      rewrite(child)
      return [child]
    }
    return splitMarkers(child.value).map((part) =>
      typeof part === 'string'
        ? { type: 'text', value: part }
        : {
            type: 'citation',
            data: {
              hName: CITATION_ELEMENT,
              hProperties: {
                ranks: part.ranks.join(','),
                ...(part.tail ? { tail: part.tail } : {})
              }
            },
            children: []
          }
    )
  })
}

/**
 * A remark transform: it changes nodes, never positions, so the blocks the
 * splitter cuts a streaming answer into (`markdown-blocks.ts`) are where
 * they were.
 */
export function remarkCitations() {
  return (tree: Node) => rewrite(tree)
}
