import type { WebSearchResult } from '@exodus/shared/types/web-search'
import {
  createContext,
  Fragment,
  memo,
  type ReactNode,
  useContext,
  useMemo
} from 'react'

import { LazyLoadImage } from './lazy-load-image'
import { SourceFavicon } from './source-favicon'
import { Badge } from './ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'

/**
 * The 【N-source】 citation markers the model writes after a web search, as
 * hover-card chips. `markdown.tsx` hands text nodes to `TextWithCitations`
 * from its `p` / `li` / `td` / `th` overrides; `sources-panel.tsx` and the
 * deep-research source list read `parseCitations`.
 */

// Matches 【1-source】 or 【1,2-source】
const citationGlobalRegex = /【([\d,\s]+)-source】/g
// Non-global variant for cheap presence checks (avoids lastIndex state on shared regex).
const citationDetectRegex = /【[\d,\s]+-source】/

// eslint-disable-next-line react-refresh/only-export-components
export function parseCitations(text: string): number[] | null {
  const matches = [...text.matchAll(citationGlobalRegex)]
  if (matches.length === 0) return null
  return matches
    .flatMap((m) =>
      m[1].split(',').flatMap((n) => {
        const parsed = parseInt(n.trim(), 10)
        return isNaN(parsed) ? [] : [parsed]
      })
    )
    .sort((a, b) => a - b)
}

// Provides webSearchResults to TextWithCitations without dragging it through the
// ReactMarkdown `components` prop, which would invalidate the components map (and
// the entire markdown subtree's memoized code blocks) every time results stream in.
export const WebSearchRankMapContext = createContext<Map<
  number,
  WebSearchResult
> | null>(null)

const CitationChip = memo(function CitationChip({
  source
}: {
  source: WebSearchResult
}) {
  let hostname = source.hostname ?? ''
  if (!hostname) {
    try {
      hostname = new URL(source.link).hostname
    } catch {
      hostname = source.link
    }
  }
  const label = source.siteName || hostname || source.title

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <a
            href={source.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="no-underline hover:no-underline"
          />
        }
      >
        <Badge variant="secondary" className="ml-1 h-4 gap-1 px-1">
          <SourceFavicon
            link={source.link}
            favicon={source.favicon}
            className="size-3"
          />
          <span className="max-w-28 truncate text-[9px]">{label}</span>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        className="w-72 overflow-hidden rounded-xl border p-0 shadow-lg"
      >
        <a href={source.link} target="_blank" rel="noopener noreferrer">
          {source.thumbnail && (
            <LazyLoadImage
              src={source.thumbnail}
              alt={source.title}
              className="h-32 w-full"
            />
          )}
          <div className="flex flex-col gap-1 p-3">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <SourceFavicon
                link={source.link}
                favicon={source.favicon}
                className="size-3"
              />
              <span className="truncate">{source.siteName || hostname}</span>
              {source.age && <span className="shrink-0">· {source.age}</span>}
            </div>
            <div className="line-clamp-2 text-sm leading-snug font-semibold">
              {source.title}
            </div>
            {source.snippet && (
              <div className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                {source.snippet}
              </div>
            )}
          </div>
        </a>
      </HoverCardContent>
    </HoverCard>
  )
})

// Splits a plain string by citation markers and interleaves CitationChip components inline.
function inlineReplaceCitations(
  text: string,
  rankMap: Map<number, WebSearchResult>
): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(citationGlobalRegex)) {
    if (match.index! > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const nums = match[1]
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n))

    nums.forEach((num) => {
      const source = rankMap.get(num)
      if (source) {
        nodes.push(
          <CitationChip key={`${match.index}-${num}`} source={source} />
        )
      }
    })
    lastIndex = match.index! + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

// Strip citation markers we can't resolve to a source — a bare "【1-source】"
// in the prose reads as a rendering bug. Happens when the model cites but no
// tool registered source N (cited from memory, an un-instrumented tool, or a
// hallucinated index).
const stripCitations = (s: string) =>
  s.replace(citationGlobalRegex, '').replace(/ {2,}/g, ' ')

export function TextWithCitations({ children }: { children: ReactNode }) {
  const rankMap = useContext(WebSearchRankMapContext)

  return useMemo<ReactNode>(() => {
    const render = (text: string): ReactNode =>
      rankMap ? inlineReplaceCitations(text, rankMap) : stripCitations(text)

    if (typeof children === 'string') {
      if (!citationDetectRegex.test(children)) return <>{children}</>
      return <>{render(children)}</>
    }

    if (Array.isArray(children)) {
      const processed = children.map((child, i) => {
        if (typeof child === 'string' && citationDetectRegex.test(child)) {
          return <Fragment key={i}>{render(child)}</Fragment>
        }
        return child
      })
      return <>{processed}</>
    }

    return <>{children}</>
  }, [children, rankMap])
}
