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
import { useState } from 'react'

import { cn } from '@/lib/utils'

import { Markdown } from './markdown'

export interface TimelineStep {
  type: 'thinking' | 'toolCall' | 'toolResult'
  text: string
  isError?: boolean
  toolName?: string
  webSearchResults?: WebSearchResult[]
}

interface ThinkingTimelineProps {
  steps: TimelineStep[]
  isStreaming: boolean
}

function StepIcon({ step }: { step: TimelineStep }) {
  if (step.type === 'toolResult' && step.isError) {
    return <XCircleIcon size={14} className="text-destructive shrink-0" />
  }
  if (step.toolName === 'webSearch') {
    return <GlobeIcon size={14} className="text-muted-foreground shrink-0" />
  }
  return (
    <ClockFadingIcon size={14} className="text-muted-foreground shrink-0" />
  )
}

function SearchResultItem({ item }: { item: WebSearchResult }) {
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
}

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
    <div className="grid grid-cols-[14px_1fr] gap-x-2.5 pb-3 last:pb-0">
      {/* Left column: icon + connector line */}
      <div className="flex flex-col items-center">
        <div className="mt-1.75 flex size-3.5 shrink-0 items-center justify-center">
          {icon}
        </div>
        {!isLast && <div className="border-border w-px flex-1 border-l" />}
      </div>
      {/* Right column: content */}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ThinkingTimeline({
  steps,
  isStreaming
}: ThinkingTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (steps.length === 0 && !isStreaming) return null

  return (
    <div className="mb-3">
      <button
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isStreaming ? (
          <LoaderIcon size={14} className="shrink-0 animate-spin" />
        ) : (
          <CheckIcon size={14} className="shrink-0" />
        )}
        <span className="font-medium">
          {isStreaming ? 'Thinking…' : 'Thought for a few seconds'}
        </span>
        <ChevronDownIcon
          size={14}
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
                      'text-muted-foreground prose-sm [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_ol]:my-0.5 [&_p]:my-0.5 [&_ul]:my-0.5',
                      step.type === 'toolResult' &&
                        step.isError &&
                        'text-destructive'
                    )}
                  >
                    {step.type === 'thinking' ? (
                      <Markdown src={step.text} parts={[]} />
                    ) : (
                      <p className="text-sm leading-relaxed">{step.text}</p>
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

              {/* Done node */}
              <TimelineNode
                isLast
                icon={
                  <CircleCheckBigIcon
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                }
              >
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Done
                </p>
              </TimelineNode>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
