import { useArtifact } from '@/hooks/use-artifact'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'
import 'katex/dist/katex.min.css'
import { Check, Copy, PencilRuler } from 'lucide-react'
import { memo, ReactNode, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import remarkGfm from 'remark-gfm'
import { useTheme } from './theme-provider'

const themes = {
  light: { codeTheme: atomOneLight, bg: 'bg-[#fafafa]' },
  dark: { codeTheme: atomOneDark, bg: 'bg-[#282c34]' }
}

function parseCitations(text: ReactNode) {
  if (typeof text !== 'string') return undefined

  const citationRegex = /\[Source: ([\d,\s]+)\]/g
  const citations: Array<{
    text: number
    position: number
    sourceNumbers: number
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

export function Markdown({
  src,
  parts
}: {
  src: string
  parts: UIMessage['parts']
}) {
  const { show: isArtifactVisible, openArtifact } = useArtifact()
  const [copiedContent, setCopiedContent] = useState<ReactNode>('')
  const { actualTheme } = useTheme()
  const { codeTheme, bg } = useMemo(() => themes[actualTheme], [actualTheme])
  const webSearchResult = useMemo(() => {
    try {
      const toolInvocationPart = parts.find(
        (part) => part.type === 'tool-invocation'
      )

      if (toolInvocationPart) {
        const { state, toolName } = toolInvocationPart.toolInvocation
        if (toolName === 'webSearch' && state === 'result') {
          return JSON.parse(
            toolInvocationPart.toolInvocation.result
          ) as DocumentType[]
        }
        return undefined
      }

      return undefined
    } catch {
      return undefined
    }
  }, [parts])
  console.log(webSearchResult)

  const handleCopy = (children: ReactNode) => {
    if (!copiedContent) {
      setCopiedContent(children)
      setTimeout(() => {
        setCopiedContent('')
      }, 2000)
    }
  }

  return (
    <section className="markdown">
      <ReactMarkdown
        // remarkPlugins={[remarkGfm, remarkMath]}
        // rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          code({ className, children, node, ...rest }) {
            const match = /language-(\w+)/.exec(className || 'javascript')
            return match ? (
              <>
                <section
                  className={cn(
                    'text-ring flex items-center justify-between p-3 text-xs',
                    bg
                  )}
                >
                  <span>{match[1]}</span>
                  <div className="flex items-center gap-6">
                    <>
                      {copiedContent !== children ? (
                        <span
                          className="flex cursor-pointer items-center gap-1.5"
                          onClick={() => handleCopy(children)}
                        >
                          <Copy size={10} />
                          Copy
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Check size={10} strokeWidth={2.5} />
                          Copied
                        </span>
                      )}
                    </>

                    <span
                      className="flex cursor-pointer items-center gap-1.5"
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
            console.log(parseCitations(children))

            // console.log(children, typeof children)
            return (
              <p {...rest} className={className}>
                {children}
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
