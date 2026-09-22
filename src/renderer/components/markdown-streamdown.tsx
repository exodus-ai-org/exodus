import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { code } from '@streamdown/code'
import { createMathPlugin } from '@streamdown/math'
import { memo, useMemo, useState } from 'react'
import { Streamdown, type StreamdownProps } from 'streamdown'

import 'katex/dist/katex.min.css'
import 'streamdown/styles.css'

import {
  TextWithCitations,
  WebSearchRankMapContext
} from './markdown-citations'

/**
 * The chat's Markdown through Vercel's streamdown — the engine experiment
 * (`lib/markdown-engine.ts`; Settings → Developer → Experiments). Same props
 * as `Markdown` in `markdown.tsx`, so the two can be compared on the same
 * transcript: streamdown brings its own block splitter and healer, shiki
 * highlighting (the `code` plugin, languages loaded on demand), KaTeX through
 * the `math` plugin, and a shadcn-token-styled component set. Our citation
 * chips are layered on through `components`, as in the default engine.
 */

const plugins: StreamdownProps['plugins'] = {
  code,
  // Same rule as the default engine: `$…$` is money, `$$…$$` is math.
  math: createMathPlugin({ singleDollarTextMath: false })
}

// The same overrides the default engine uses to find text nodes that may
// carry 【N-source】 markers. Everything else is streamdown's own.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- streamdown's component props are broad
const components: Record<string, any> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  p({ node, children, ...rest }: any) {
    return (
      <p {...rest}>
        <TextWithCitations>{children}</TextWithCitations>
      </p>
    )
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  li({ node, children, ...rest }: any) {
    return (
      <li {...rest}>
        <TextWithCitations>{children}</TextWithCitations>
      </li>
    )
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  td({ node, children, ...rest }: any) {
    return (
      <td {...rest}>
        <TextWithCitations>{children}</TextWithCitations>
      </td>
    )
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  th({ node, children, ...rest }: any) {
    return (
      <th {...rest}>
        <TextWithCitations>{children}</TextWithCitations>
      </th>
    )
  }
}

export function StreamdownMarkdown({
  src,
  webSearchResults
}: {
  src: string
  webSearchResults?: WebSearchResult[]
}) {
  // History renders once, whole ("static"); text that changes after mount is
  // a streaming reply ("streaming": block memo + healing), as in `Markdown`.
  const [mountedWith] = useState(src)
  const [streams, setStreams] = useState(false)
  if (!streams && src !== mountedWith) setStreams(true)

  const rankMap = useMemo(() => {
    if (!webSearchResults || webSearchResults.length === 0) return null
    return new Map(webSearchResults.map((r) => [r.rank, r]))
  }, [webSearchResults])

  return (
    <WebSearchRankMapContext.Provider value={rankMap}>
      {/* Not `.markdown`: that class carries the default engine's own
          typography (globals.css) and would sit on top of streamdown's
          styling — the point of the experiment is to see streamdown's. */}
      <section className="max-w-none" data-markdown-engine="streamdown">
        <Streamdown
          mode={streams ? 'streaming' : 'static'}
          isAnimating={streams}
          plugins={plugins}
          components={components}
        >
          {src}
        </Streamdown>
      </section>
    </WebSearchRankMapContext.Provider>
  )
}

export default memo(
  StreamdownMarkdown,
  (prev, next) =>
    prev.src === next.src && prev.webSearchResults === next.webSearchResults
)
