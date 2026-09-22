import { WebSearchResult } from '@exodus/shared/types/web-search'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  createContext,
  Fragment,
  memo,
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'

import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { useClipboard } from '@/hooks/use-clipboard'
import {
  INCOMPLETE_LINK_HREF,
  createMarkdownBlockCache,
  healStreamingTail,
  splitMarkdownBlocks,
  type MarkdownBlockCache
} from '@/lib/markdown-blocks'
import {
  rehypePluginsStable,
  remarkPluginsStable
} from '@/lib/markdown-plugins'
import { cn } from '@/lib/utils'

import { LazyLoadImage } from './lazy-load-image'
import { SourceFavicon } from './source-favicon'
import { Badge } from './ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'

const themes = {
  light: { codeTheme: atomOneLight },
  dark: { codeTheme: atomOneDark }
}

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
const WebSearchRankMapContext = createContext<Map<
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

function TextWithCitations({ children }: { children: ReactNode }) {
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

const codeBlockStyle = {
  padding: '0.75rem',
  fontSize: '0.8125rem',
  lineHeight: '1.5',
  margin: 0,
  // The outer `.markdown pre` already scrolls/caps height; keep this inner
  // element from establishing its own competing scroll or clipping.
  maxHeight: 'none',
  overflow: 'visible'
}

/**
 * One top-level block of a document. Memoized on its text: while a reply
 * streams, only the last block or two are different from the frame before, so
 * everything above them — finished paragraphs, highlighted code, KaTeX — is
 * left alone instead of being re-parsed and re-rendered each frame.
 */
const MarkdownBlock = memo(function MarkdownBlock({
  src,
  components
}: {
  src: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ReactMarkdown component overrides use broad prop types
  components: Record<string, any>
}) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPluginsStable}
      rehypePlugins={rehypePluginsStable}
      components={components}
    >
      {src}
    </ReactMarkdown>
  )
})

/**
 * The document as the blocks to render. Text that never changes — all of a
 * chat's history — stays a single block: splitting costs a parse of its own and
 * only pays for itself when there are frames to skip. The first time `src`
 * differs from what this instance mounted with, it is a streaming reply, and
 * from then on it is split (incrementally — see splitMarkdownBlocks).
 */
function useMarkdownBlocks(src: string): string[] {
  const [mountedWith] = useState(src)
  const [streams, setStreams] = useState(false)
  if (!streams && src !== mountedWith) setStreams(true)

  // A memo table for the splitter, nothing more: what it returns depends on
  // `src` alone, the cache only lets it skip re-parsing the closed blocks.
  const cacheRef = useRef<MarkdownBlockCache | null>(null)
  return useMemo(() => {
    if (!streams) return [src]
    cacheRef.current ??= createMarkdownBlockCache()
    const blocks = splitMarkdownBlocks(src, cacheRef.current)
    // Only the last block is still arriving; the ones above it are closed.
    if (blocks.length > 0) {
      blocks[blocks.length - 1] = healStreamingTail(blocks[blocks.length - 1])
    }
    return blocks
  }, [src, streams])
}

export function Markdown({
  src,
  webSearchResults
}: {
  src: string
  webSearchResults?: WebSearchResult[]
}) {
  const { t } = useTranslation('common')
  const { copied, handleCopy } = useClipboard()
  const { resolvedTheme } = useTheme()
  // resolvedTheme is undefined on first paint until next-themes hydrates;
  // fall back to the light theme so syntax highlighting renders something
  // sensible instead of crashing.
  const themeKey: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  const { codeTheme } = useMemo(() => themes[themeKey], [themeKey])

  const blocks = useMarkdownBlocks(src)

  const rankMap = useMemo(() => {
    if (!webSearchResults || webSearchResults.length === 0) return null
    return new Map(webSearchResults.map((r) => [r.rank, r]))
  }, [webSearchResults])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ReactMarkdown component overrides use broad prop types
  const components: Record<string, any> = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      code({ className, children, node, ...rest }: any) {
        const match = /language-(\w+)/.exec(className || 'javascript')
        return match ? (
          <>
            <section
              className={cn(
                'text-ring flex items-center justify-between p-2 text-xs'
              )}
            >
              <span>{match[1]}</span>
              <div className="flex cursor-default items-center gap-6">
                {copied !== children ? (
                  <button
                    type="button"
                    className="hover:text-primary flex items-center gap-1.5"
                    onClick={() => {
                      if (typeof children === 'string') {
                        handleCopy(children)
                      }
                    }}
                  >
                    <CopyIcon size={10} />
                    {t('action.copy')}
                  </button>
                ) : (
                  <span className="hover:text-primary flex items-center gap-1.5">
                    <CheckIcon size={10} strokeWidth={2.5} />
                    {t('state.copied')}
                  </span>
                )}
              </div>
            </section>

            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              language={match[1]}
              style={codeTheme}
              customStyle={codeBlockStyle}
              showLineNumbers
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </>
        ) : (
          <code {...rest} className={className}>
            {children}
          </code>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      pre({ className, children, node, ...rest }: any) {
        return (
          <pre {...rest} className={className}>
            {children}
          </pre>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      li({ className, node, children, ...rest }: any) {
        return (
          <li {...rest} className={className}>
            <TextWithCitations>{children}</TextWithCitations>
          </li>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      p({ className, node, children, ...rest }: any) {
        return (
          <p {...rest} className={className}>
            <TextWithCitations>{children}</TextWithCitations>
          </p>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      img({ className, node, alt, ...rest }: any) {
        return (
          <img
            {...rest}
            alt={alt ?? ''}
            loading="lazy"
            className={cn('mb-3', className)}
          />
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      a({ className, children, node, href, ...rest }: any) {
        // A link still streaming in (see healStreamingTail) is text until
        // its URL is complete.
        if (href === INCOMPLETE_LINK_HREF) return <span>{children}</span>
        // Styling lives in globals.css `.markdown a` — primary color, no
        // underline by default, underline on hover. The previous always-bold
        // + always-underlined treatment made body text feel cluttered.
        return (
          <a
            {...rest}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            className={className}
          >
            {children}
          </a>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      table({ className, children, node, ...rest }: any) {
        // No outer border / wrapper border — internal row dividers (handled
        // on thead/tr below) carry the structure. Wider tables still scroll
        // horizontally via overflow-x-auto without the boxed-in feel.
        return (
          <div className="mb-[var(--md-gap)] overflow-x-auto text-[0.9375rem] leading-normal last:mb-0">
            <table {...rest} className={cn('w-full caption-bottom', className)}>
              {children}
            </table>
          </div>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      thead({ className, children, node, ...rest }: any) {
        return (
          <thead
            {...rest}
            className={cn('[&_tr]:border-border [&_tr]:border-b', className)}
          >
            {children}
          </thead>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      tbody({ className, children, node, ...rest }: any) {
        return (
          <tbody
            {...rest}
            className={cn('[&_tr:last-child]:border-0', className)}
          >
            {children}
          </tbody>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      tr({ className, children, node, ...rest }: any) {
        return (
          <tr {...rest} className={cn('border-border border-b', className)}>
            {children}
          </tr>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      th({ className, children, style, node, ...rest }: any) {
        return (
          <th
            {...rest}
            className={cn(
              'text-foreground py-2.5 pr-6 text-left align-top font-medium last:pr-0',
              className
            )}
          >
            <TextWithCitations>{children}</TextWithCitations>
          </th>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      td({ className, children, node, ...rest }: any) {
        return (
          <td
            {...rest}
            className={cn(
              'text-foreground py-2.5 pr-6 align-top font-normal last:pr-0',
              className
            )}
          >
            <TextWithCitations>{children}</TextWithCitations>
          </td>
        )
      }
      // br() {
      //   return null
      // }
    }),
    [copied, handleCopy, codeTheme, t]
  )

  return (
    <WebSearchRankMapContext.Provider value={rankMap}>
      <section className="markdown max-w-none">
        {/* Blocks are only ever appended or grown in place — never reordered
            — so the index is their identity. They render as fragments: the DOM
            under .markdown is the same flat run of elements as before. */}
        {blocks.map((block, i) => (
          // eslint-disable-next-line react/no-array-index-key -- see above
          <MarkdownBlock key={i} src={block} components={components} />
        ))}
      </section>
    </WebSearchRankMapContext.Provider>
  )
}

export default memo(
  Markdown,
  (prevProps, nextProps) =>
    prevProps.src === nextProps.src &&
    prevProps.webSearchResults === nextProps.webSearchResults
)
