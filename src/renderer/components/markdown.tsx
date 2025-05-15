import { useArtifact } from '@/hooks/use-artifact'
import { useClipboard } from '@/hooks/use-clipboard'
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
  light: { codeTheme: atomOneLight, bg: 'bg-[#fafafa]' },
  dark: { codeTheme: atomOneDark, bg: 'bg-[#282c34]' }
}

const citationRegex = /\[Source: ([\d,\s]+)\]/g

function parseCitations(text: ReactNode) {
  if (typeof text !== 'string') return undefined

  const citations: Array<{
    text: string
    position: number
    sourceNumbers: number[]
  }> = []
  let match: RegExpExecArray | null = null

  while ((match = citationRegex.exec(text)) !== null) {
    const sourceNumbers = match[1]
      .split(',')
      .map((num) => parseInt(num.trim(), 10))
    citations.push({
      text: match[0],
      position: match.index,
      sourceNumbers
    })
  }

  return citations
}

function ParagraphWithSources({
  children,
  webSearchResults
}: {
  children: ReactNode
  webSearchResults: WebSearchResult[] | undefined
}) {
  if (!webSearchResults) return children
  const source = parseCitations(children)
  if (!Array.isArray(source?.[0]?.sourceNumbers)) return children

  const referredWebSearchResults = webSearchResults.filter((item) =>
    source[0].sourceNumbers.includes(item.rank)
  )

  return (
    <>
      {typeof children === 'string' && children.replace(citationRegex, '')}
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
  parts?: UIMessage['parts']
}) {
  const { show: isArtifactVisible, openArtifact } = useArtifact()
  const { copied, handleCopy } = useClipboard()
  const { actualTheme } = useTheme()
  const { codeTheme, bg } = useMemo(() => themes[actualTheme], [actualTheme])
  const webSearchResults = useMemo(() => {
    try {
      const toolInvocationPart = parts?.find(
        (part) => part.type === 'tool-invocation'
      )

      if (toolInvocationPart) {
        const { state, toolName } = toolInvocationPart.toolInvocation
        if (toolName === 'webSearch' && state === 'result') {
          return JSON.parse(
            toolInvocationPart.toolInvocation.result
          ) as WebSearchResult[]
        }
        return undefined
      }

      return undefined
    } catch {
      return undefined
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
                    'text-ring flex items-center justify-between p-3 pb-0 text-xs',
                    bg
                  )}
                >
                  <span>{match[1]}</span>
                  <div className="flex items-center gap-6">
                    <>
                      {copied !== children ? (
                        <span
                          className="hover:text-primary flex cursor-pointer items-center gap-1.5"
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
                      className="hover:text-primary flex cursor-pointer items-center gap-1.5"
                      onClick={openArtifact}
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
                  customStyle={{ padding: '0.75rem' }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </>
            ) : (
              <code
                {...rest}
                className={cn(
                  className,
                  'text-primary bg-accent rounded-[6px] px-[6px] py-[1px] text-xs'
                )}
              >
                {children}
              </code>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          pre({ className, children, node, ...rest }) {
            return (
              <pre
                {...rest}
                className={cn(
                  'border-border mb-4 overflow-x-scroll rounded-md border text-xs md:max-w-[45rem]',
                  { ['w-[23rem]']: isArtifactVisible },
                  className
                )}
              >
                {children}
              </pre>
            )
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          p({ className, node, children, ...rest }) {
            return (
              <p {...rest} className={className}>
                <ParagraphWithSources webSearchResults={webSearchResults}>
                  {children}
                </ParagraphWithSources>
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
