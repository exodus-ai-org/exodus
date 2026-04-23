import type { TimelineStep } from '@shared/types/chat'
import type { WebSearchResult } from '@shared/types/web-search'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  ClockFadingIcon,
  GlobeIcon,
  LoaderIcon,
  XCircleIcon
} from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { Markdown } from './markdown'
import { ShimmeringText } from './shimmering-text'

export type { TimelineStep }

interface ThinkingTimelineProps {
  steps: TimelineStep[]
  durationMs: number
  isStreaming: boolean
}

function StepIcon({ step }: { step: TimelineStep }) {
  if (step.type === 'toolResult' && step.isError) {
    return <XCircleIcon size={16} className="text-destructive shrink-0" />
  }
  if (step.toolName === 'webSearch') {
    return <GlobeIcon size={16} className="text-muted-foreground shrink-0" />
  }
  return (
    <ClockFadingIcon size={16} className="text-muted-foreground shrink-0" />
  )
}

const SearchResultItem = memo(function SearchResultItem({
  item
}: {
  item: WebSearchResult
}) {
  let hostname = ''
  let favicon = ''
  try {
    const url = new URL(item.link)
    hostname = url.hostname
    favicon = `https://www.google.com/s2/favicons?domain=${url.origin}&sz=128`
  } catch {
    hostname = item.link
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1"
    >
      <img src={favicon} alt="" className="size-3.5 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1 truncate text-xs">{item.title}</span>
      <span className="text-muted-foreground shrink-0 text-[10px]">
        {hostname}
      </span>
    </a>
  )
})

function TimelineNode({
  icon,
  isLast,
  children
}: {
  icon: React.ReactNode
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5 pb-3 last:pb-0">
      <div className="mt-1 flex flex-col items-center">
        <div className="flex shrink-0 items-center justify-center">{icon}</div>
        {!isLast && <div className="border-border w-px flex-1 border-l" />}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`
}

/** Extract a short title from a step for the collapsed preview */
function getStepTitle(step: TimelineStep): string {
  if (step.type === 'toolCall') return step.text
  if (step.type === 'toolResult' && step.webSearchResults) {
    return `${step.webSearchResults.length} search results`
  }
  if (step.type === 'toolResult' && step.isError) return step.text
  // thinking: extract **bold** or first line
  const boldMatch = step.text.match(/\*\*(.+?)\*\*/)
  if (boldMatch) return boldMatch[1]
  return step.text.split('\n').filter(Boolean)[0]?.slice(0, 60) ?? 'Thinking…'
}

export function ThinkingTimeline({
  steps,
  durationMs,
  isStreaming
}: ThinkingTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), [])

  const latestTitle = useMemo(() => {
    if (steps.length === 0) return 'Thinking…'
    return getStepTitle(steps[steps.length - 1])
  }, [steps])

  if (steps.length === 0 && !isStreaming) return null

  const headerText = isStreaming
    ? latestTitle
    : `Thought for ${formatDuration(durationMs)}`

  return (
    <div className="mb-3">
      <button
        className="text-muted-foreground hover:text-foreground flex max-w-full items-center gap-1.5 overflow-hidden text-sm transition-colors"
        onClick={toggleExpanded}
      >
        {isStreaming ? (
          <LoaderIcon size={16} className="shrink-0 animate-spin" />
        ) : (
          <CheckIcon size={16} className="shrink-0" />
        )}
        {isStreaming ? (
          <ShimmeringText
            key={headerText}
            className="truncate font-medium"
            text={headerText}
          />
        ) : (
          <span className="truncate font-medium">{headerText}</span>
        )}
        <ChevronDownIcon
          size={16}
          className={cn(
            'shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2">
              {steps.map((step, i) => (
                <TimelineNode key={i} icon={<StepIcon step={step} />}>
                  <div
                    className={cn(
                      'text-muted-foreground text-sm leading-relaxed [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_ol]:my-0.5 [&_ul]:my-0.5 [&_p:first-child]:mt-0 [&_p]:my-0.5',
                      step.type === 'toolResult' &&
                        step.isError &&
                        'text-destructive'
                    )}
                  >
                    {step.type === 'thinking' ? (
                      <Markdown src={step.text} parts={[]} />
                    ) : (
                      <>
                        <p>{step.text}</p>
                        {step.codeArgument && (
                          <div className="mt-1 max-h-72 overflow-auto">
                            <Markdown
                              src={`~~~bash\n${step.codeArgument}\n~~~`}
                              parts={[]}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {step.webSearchResults &&
                    step.webSearchResults.length > 0 && (
                      <div className="mt-1.5 flex max-h-30.5 flex-col gap-0.5 overflow-y-auto rounded-lg border p-1">
                        {step.webSearchResults.map((result) => (
                          <SearchResultItem key={result.link} item={result} />
                        ))}
                      </div>
                    )}
                </TimelineNode>
              ))}

              {/* Done node — only when streaming is finished */}
              {!isStreaming && (
                <TimelineNode
                  isLast
                  icon={
                    <CircleCheckBigIcon
                      size={16}
                      className="text-muted-foreground shrink-0"
                    />
                  }
                >
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Done
                  </p>
                </TimelineNode>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
