import { faviconUrl } from '@shared/constants/external-urls'
import { WebSearchResult } from '@shared/types/web-search'
import { CheckIcon, CopyIcon } from 'lucide-react'
import {
  createContext,
  Fragment,
  memo,
  ReactNode,
  useContext,
  useMemo
} from 'react'

import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { useClipboard } from '@/hooks/use-clipboard'
import { cn } from '@/lib/utils'

import { useTheme } from './theme-provider'
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
    .flatMap((m) => m[1].split(',').map((n) => parseInt(n.trim(), 10)))
    .filter((n) => !isNaN(n))
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
  let origin = ''
  try {
    origin = new URL(source.link).origin
  } catch {
    return null
  }

  // Prefer Brave's served favicon (consistent rendering, cached by their CDN);
  // fall back to a derived favicon URL for legacy results without one.
  const favicon = source.favicon || faviconUrl(origin)
  // Badge shows the human-readable publisher name (e.g. "The New York Times")
  // instead of the article title, which used to read like a sentence and was
  // both visually noisy and rarely uniquely identifying.
  const badgeLabel = source.publisher || source.title

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge
          variant="secondary"
          className="ml-1 max-w-22 cursor-pointer align-middle text-[0.625rem] no-underline"
          render={
            <a href={source.link} target="_blank" rel="noopener noreferrer" />
          }
        >
          <span className="truncate">{badgeLabel}</span>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        className="w-72 overflow-hidden rounded-xl border p-0 shadow-lg"
      >
        <a href={source.link} target="_blank" rel="noopener noreferrer">
          {source.ogImage && (
            <img
              src={source.ogImage}
              alt={source.title}
              loading="lazy"
              className="h-32 w-full object-cover"
            />
          )}
          <div className="flex flex-col gap-1 p-3">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <img src={favicon} className="size-3" alt="" />
              {new URL(source.link).hostname}
            </div>
            <div className="line-clamp-2 text-sm leading-snug font-semibold">
              {source.title}
            </div>
            <div className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
              {source.snippet}
            </div>
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

function TextWithCitations({ children }: { children: ReactNode }) {
  const rankMap = useContext(WebSearchRankMapContext)

  return useMemo<ReactNode>(() => {
    if (!rankMap) return <>{children}</>

    if (typeof children === 'string') {
      if (!citationDetectRegex.test(children)) return <>{children}</>
      return <>{inlineReplaceCitations(children, rankMap)}</>
    }

    if (Array.isArray(children)) {
      const processed = children.map((child, i) => {
        if (typeof child === 'string' && citationDetectRegex.test(child)) {
          return (
            <Fragment key={i}>
              {inlineReplaceCitations(child, rankMap)}
            </Fragment>
          )
        }
        return child
      })
      return <>{processed}</>
    }

    return <>{children}</>
  }, [children, rankMap])
}

// Stable plugin arrays hoisted outside component to avoid re-creation on every render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remarkPluginsStable: any[] = [
  remarkGfm,
  [
    remarkMath,
    {
      // KaTeX supports both single dollar ($) and double dollar ($$) delimiters for math expressions.
      // However, ordinary text containing single dollar signs, such as: "The daily salary ranges from $200 - $300," can be incorrectly interpreted as KaTeX.
      // Therefore, ensure that the `singleDollarTextMath` parameter is set to `false` to prevent this.
      // **IMPORTANT:** Instruct your LLM model to always use the double dollar ($$) format when writing mathematical formulas using KaTeX:
      // e.g. "When writing mathematical formulas using KaTeX format, enclose them within **$$** symbols."
      singleDollarTextMath: false
    }
  ]
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypePluginsStable: any[] = [rehypeKatex]

const codeBlockStyle = {
  padding: '0.75rem',
  fontSize: '0.8125rem',
  lineHeight: '1.5'
}

export function Markdown({
  src,
  webSearchResults
}: {
  src: string
  webSearchResults?: WebSearchResult[]
}) {
  const { copied, handleCopy } = useClipboard()
  const { actualTheme } = useTheme()
  const { codeTheme } = useMemo(() => themes[actualTheme], [actualTheme])

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
                  <span
                    className="hover:text-primary flex items-center gap-1.5"
                    onClick={() => {
                      if (typeof children === 'string') {
                        handleCopy(children)
                      }
                    }}
                  >
                    <CopyIcon size={10} />
                    Copy
                  </span>
                ) : (
                  <span className="hover:text-primary flex items-center gap-1.5">
                    <CheckIcon size={10} strokeWidth={2.5} />
                    Copied
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
      img({ className, node, ...rest }: any) {
        return (
          <img {...rest} loading="lazy" className={cn('mb-3', className)} />
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      a({ className, children, node, ...rest }: any) {
        return (
          <a
            {...rest}
            rel="noopener noreferrer"
            target="_blank"
            className={cn('font-bold wrap-break-word underline', className)}
          >
            {children}
          </a>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      table({ className, children, node, ...rest }: any) {
        return (
          <div className="mb-4 overflow-x-auto rounded-md border text-sm leading-normal">
            <table
              {...rest}
              className={cn('min-w-full caption-bottom', className)}
            >
              {children}
            </table>
          </div>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      thead({ className, children, node, ...rest }: any) {
        return (
          <thead {...rest} className={cn('[&_tr]:border-b', className)}>
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
          <tr
            {...rest}
            className={cn(
              'hover:bg-muted/50 border-b transition-colors',
              className
            )}
          >
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
              'text-foreground px-3 py-2.5 text-left align-middle font-medium whitespace-nowrap',
              className
            )}
          >
            {children}
          </th>
        )
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      td({ className, children, node, ...rest }: any) {
        return (
          <td
            {...rest}
            style={{ fontWeight: 400 }}
            className={cn(
              'text-foreground px-3 py-2 align-middle whitespace-nowrap',
              className
            )}
          >
            {children}
          </td>
        )
      }
      // br() {
      //   return null
      // }
    }),
    [copied, handleCopy, codeTheme]
  )

  return (
    <WebSearchRankMapContext.Provider value={rankMap}>
      <section className="markdown max-w-none">
        <ReactMarkdown
          remarkPlugins={remarkPluginsStable}
          rehypePlugins={rehypePluginsStable}
          components={components}
        >
          {src}
        </ReactMarkdown>
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
