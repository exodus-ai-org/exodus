import { useClipboard } from '@/hooks/use-clipboard'
import { useImmersion } from '@/hooks/use-immersion'
import { cn } from '@/lib/utils'
import { WebSearchResult } from '@shared/types/web-search'
import type { UIMessage } from 'ai'
import 'katex/dist/katex.min.css'
import { Check, Copy, PencilRuler } from 'lucide-react'
import { memo, ReactNode, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { WebSearchGroup } from './calling-tools/web-search/web-search-group'
import { useTheme } from './theme-provider'

const themes = {
  light: { codeTheme: atomOneLight },
  dark: { codeTheme: atomOneDark }
}

const citationGlobalRegex = /\[Source:\s*([\d,\s]+)\]/g

// When using the web-search or deep-research features, the AI outputs markdown text with citation markers.
// There are two formats:
// 1. Pure text with appended citation markers.
//    e.g. "The quick brown fox jumps over the lazy dog. [Source 1, 2, 3]"
// 2. Mixed content with appended citation markers.
//    e.g. "If `nums[k] + nums[l]` is less than the required sum. [Source 1, 2, 3]"
//
// For the first case, we can simply use `citationRegex` to extract the citation.
//
// For the second case, the content will be rendered as an array by React,
// since it includes not only plain text but also HTML elements such as <code> or <strong>.
// In this case, we should check whether the last element is a pure text node
// to determine whether the citation can be extracted.
function parseCitations(children: ReactNode) {
  if (Array.isArray(children)) {
    const lastChild = children[children.length - 1]
    if (typeof lastChild === 'string') {
      children = lastChild as string
    }
  }
  if (typeof children !== 'string') return null

  const matches = [...children.matchAll(citationGlobalRegex)]
  if (matches.length === 0) return null

  const citations = matches
    .map((match) => match[1].split(',').map((num) => parseInt(num.trim(), 10)))
    .flat()
    .sort((a, b) => a - b)
  return citations
}

function TextWithCitations({
  children,
  webSearchResults
}: {
  children: ReactNode
  webSearchResults: WebSearchResult[] | undefined
}) {
  if (!webSearchResults) return children

  const citations = parseCitations(children)
  if (citations === null) return children

  const referredWebSearchResults = webSearchResults.filter((item) =>
    citations.includes(item.rank)
  )

  return (
    <>
      {typeof children === 'string' &&
        children.replaceAll(citationGlobalRegex, '')}
      {Array.isArray(children) && (
        <>
          {children.map((item) => {
            if (typeof item === 'string') {
              return item.replaceAll(citationGlobalRegex, '')
            } else {
              return item
            }
          })}
        </>
      )}
      <WebSearchGroup
        webSearchResults={referredWebSearchResults}
        variant="tiling"
      />
    </>
  )
}

export function Markdown({
  src,
  parts
}: {
  src: string
  parts: UIMessage['parts']
}) {
  const { show: isImmersionVisible, openImmersion } = useImmersion()
  const { copied, handleCopy } = useClipboard()
  const { actualTheme } = useTheme()
  const { codeTheme } = useMemo(() => themes[actualTheme], [actualTheme])
  const webSearchResults = useMemo(() => {
    try {
      const toolInvocationPart = parts.find(
        (part) => part.type === 'tool-invocation'
      )

      if (toolInvocationPart) {
        const { state, toolName } = toolInvocationPart.toolInvocation
        if (toolName === 'webSearch' && state === 'result') {
          return toolInvocationPart.toolInvocation.result
        }
        return null
      }

      return null
    } catch {
      return null
    }
  }, [parts])

  return (
    <section className="markdown">
      <ReactMarkdown
        remarkPlugins={[
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
        ]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          code({ className, children, node, ...rest }) {
            const match = /language-(\w+)/.exec(className || 'javascript')
            return match ? (
              <>
                <section
                  className={cn(
                    'text-ring flex items-center justify-between pb-0 text-xs'
                  )}
                >
                  <span>{match[1]}</span>
                  <div className="flex items-center gap-6">
                    <>
                      {copied !== children ? (
                        <span
                          className="hover:text-primary flex items-center gap-1.5"
                          onClick={() => {
                            if (typeof children === 'string') {
                              handleCopy(children)
                            }
                          }}
                        >
                          <Copy size={10} />
                          Copy
                        </span>
                      ) : (
                        <span className="hover:text-primary flex items-center gap-1.5">
                          <Check size={10} strokeWidth={2.5} />
                          Copied
                        </span>
                      )}
                    </>

                    <span
                      className="hover:text-primary flex items-center gap-1.5"
                      onClick={() => openImmersion('')}
                    >
                      <PencilRuler size={10} />
                      Edit
                    </span>
                  </div>
                </section>

                {/* @ts-expect-error I don't know why. 🤷 */}
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  language={match[1]}
                  style={codeTheme}
                  customStyle={{ padding: '0.75rem', paddingBottom: 0 }}
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pre({ className, children, node, ...rest }) {
            return (
              <pre
                {...rest}
                className={cn({ ['w-[24rem]']: isImmersionVisible }, className)}
              >
                {children}
              </pre>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          li({ className, node, children, ...rest }) {
            return (
              <li {...rest} className={className}>
                <TextWithCitations webSearchResults={webSearchResults}>
                  {children}
                </TextWithCitations>
              </li>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          p({ className, node, children, ...rest }) {
            return (
              <p {...rest} className={className}>
                <TextWithCitations webSearchResults={webSearchResults}>
                  {children}
                </TextWithCitations>
              </p>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img({ className, node, ...rest }) {
            return (
              <img {...rest} loading="lazy" className={cn('mb-3', className)} />
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a({ className, children, node, ...rest }) {
            return (
              <a
                {...rest}
                rel="noopener noreferrer"
                target="_blank"
                className={cn('font-bold break-words underline', className)}
              >
                {children}
              </a>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          table({ className, children, node, ...rest }) {
            return (
              <div className="mb-4 w-full caption-bottom overflow-x-scroll rounded-md border text-sm md:max-w-[45rem]">
                <table {...rest} className={cn(className, 'w-full')}>
                  {children}
                </table>
              </div>
            )
          }
        }}
      >
        {src}
      </ReactMarkdown>
    </section>
  )
}

export default memo(
  Markdown,
  (prevProps, nextProps) => prevProps.src === nextProps.src
)
