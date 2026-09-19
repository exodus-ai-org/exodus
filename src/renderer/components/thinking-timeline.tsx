import { faviconUrl } from '@exodus/shared/constants/external-urls'
import type { TimelineStep } from '@exodus/shared/types/chat'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import {
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  ClockFadingIcon,
  GlobeIcon,
  LoaderIcon,
  XCircleIcon
} from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { i18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { Markdown } from './markdown'
import { ShimmeringText } from './shimmering-text'
import { Badge } from './ui/badge'

export type { TimelineStep }

interface ThinkingTimelineProps {
  steps: TimelineStep[]
  durationMs: number
  isStreaming: boolean
}

type StepStatus = 'complete' | 'active' | 'pending'

// Matches AI SDK Elements' chain-of-thought status grading: the step in flight
// reads at full strength, settled steps recede.
const STATUS_TEXT: Record<StepStatus, string> = {
  complete: 'text-muted-foreground',
  active: 'text-foreground',
  pending: 'text-muted-foreground/50'
}

function StepIcon({
  step,
  status
}: {
  step: TimelineStep
  status: StepStatus
}) {
  if (step.type === 'toolResult' && step.isError) {
    return <XCircleIcon size={15} className="text-destructive shrink-0" />
  }
  const cls = cn('shrink-0', STATUS_TEXT[status])
  if (step.toolName === 'webSearch')
    return <GlobeIcon size={15} className={cls} />
  if (step.type === 'thinking') return <BrainIcon size={15} className={cls} />
  return <ClockFadingIcon size={15} className={cls} />
}

const SearchResultPill = memo(function SearchResultPill({
  item
}: {
  item: WebSearchResult
}) {
  let favicon = ''
  try {
    favicon = faviconUrl(new URL(item.link).origin)
  } catch {
    // no favicon — the label still renders
  }

  return (
    <Badge
      variant="outline"
      className="max-w-[14rem] gap-1 font-normal"
      render={
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          title={item.title}
        />
      }
    >
      {favicon && (
        <img src={favicon} alt="" className="size-3 shrink-0 rounded-full" />
      )}
      <span className="truncate">{item.title}</span>
    </Badge>
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
    <div className="animate-in fade-in-0 slide-in-from-top-1 flex gap-2.5 pb-3 duration-300 last:pb-0">
      <div className="mt-1 flex flex-col items-center">
        <div className="flex shrink-0 items-center justify-center">{icon}</div>
        {!isLast && <div className="border-border w-px flex-1 border-l" />}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * A plain helper (not a component or hook) — translated text goes through
 * the shared `i18n` singleton directly, matching `getToolCallPreview` in
 * `messages.tsx`.
 */
function formatDuration(ms: number): string | null {
  // Message timestamps mark stream START, not END (see pi-ai providers), so
  // sub-second durations are unreliable — drop them rather than show "0 seconds".
  if (!Number.isFinite(ms) || ms < 1000) return null
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return i18n.t('chat:thinkingTimeline.durationSeconds', { count: seconds })
  }
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0
    ? i18n.t('chat:thinkingTimeline.durationMinutesSeconds', {
        minutes,
        seconds: remaining
      })
    : i18n.t('chat:thinkingTimeline.durationMinutes', { minutes })
}

/** Extract a short title from a step for the collapsed preview */
function getStepTitle(step: TimelineStep): string {
  if (step.type === 'toolCall') return step.text
  if (step.type === 'toolResult' && step.webSearchResults) {
    return i18n.t('chat:thinkingTimeline.searchResultCount', {
      count: step.webSearchResults.length
    })
  }
  if (step.type === 'toolResult' && step.isError) return step.text
  // thinking: extract **bold** or first line
  const boldMatch = step.text.match(/\*\*(.+?)\*\*/)
  if (boldMatch) return boldMatch[1]
  return (
    step.text.split('\n').filter(Boolean)[0]?.slice(0, 60) ??
    i18n.t('chat:thinkingTimeline.thinking')
  )
}

export function ThinkingTimeline({
  steps,
  durationMs,
  isStreaming
}: ThinkingTimelineProps) {
  const { t } = useTranslation('chat')
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), [])

  const hasThinking = useMemo(
    () => steps.some((s) => s.type === 'thinking'),
    [steps]
  )

  const latestTitle = useMemo(() => {
    if (steps.length === 0)
      return hasThinking
        ? t('thinkingTimeline.thinking')
        : t('thinkingTimeline.working')
    return getStepTitle(steps[steps.length - 1])
  }, [steps, hasThinking, t])

  if (steps.length === 0 && !isStreaming) return null

  const verb = hasThinking
    ? t('thinkingTimeline.thought')
    : t('thinkingTimeline.worked')
  const duration = formatDuration(durationMs)
  const headerText = isStreaming
    ? latestTitle
    : duration
      ? t('thinkingTimeline.thoughtFor', { verb, duration })
      : verb

  return (
    // min-w-0 lets the timeline shrink inside flex parents instead of pushing
    // them wider when a tool-call URL or path is long. max-w-full clamps it
    // to the ancestor (e.g. md:max-w-3xl) regardless of intrinsic content.
    <div className="mb-3 max-w-full min-w-0">
      <button
        type="button"
        aria-expanded={isExpanded}
        className="text-muted-foreground hover:text-foreground flex max-w-full items-center gap-1.5 overflow-hidden text-sm transition-colors"
        onClick={toggleExpanded}
      >
        {isStreaming ? (
          <LoaderIcon size={16} className="shrink-0 animate-spin" />
        ) : hasThinking ? (
          <BrainIcon size={16} className="shrink-0" />
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

      {/* CSS grid-rows trick: animates height:auto with zero JS (replaces the
          old framer-motion AnimatePresence). Content stays mounted so the
          per-step slide-in animations only fire once, on first appearance. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2">
            {/* react-doctor/no-array-index-as-key: suppressed — TimelineStep has no
              stable id field. Steps are append-only during streaming (they never
              reorder or get removed while visible), so index keys are safe here. */}
            {steps.map((step, i) => {
              const status: StepStatus = !isStreaming
                ? 'complete'
                : i === steps.length - 1
                  ? 'active'
                  : 'complete'
              return (
                <TimelineNode
                  key={i}
                  icon={<StepIcon step={step} status={status} />}
                >
                  <div
                    className={cn(
                      // min-w-0 break-words: tool-call previews like
                      // "webFetch: https://…/long-url.pdf" must wrap mid-URL
                      // instead of overflowing the timeline.
                      'min-w-0 text-sm leading-relaxed wrap-break-word [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_ol]:my-0.5 [&_ul]:my-0.5 [&_p:first-child]:mt-0 [&_p]:my-0.5',
                      STATUS_TEXT[status],
                      step.type === 'toolResult' &&
                        step.isError &&
                        'text-destructive'
                    )}
                  >
                    {step.type === 'thinking' ? (
                      <Markdown src={step.text} />
                    ) : (
                      <>
                        <p className="wrap-break-word">{step.text}</p>
                        {step.codeArgument && (
                          <pre className="bg-muted/50 border-border/60 mt-1 max-h-48 overflow-auto rounded-md border p-2 font-mono text-[11.5px] leading-relaxed wrap-break-word whitespace-pre-wrap">
                            <code>{step.codeArgument}</code>
                          </pre>
                        )}
                      </>
                    )}
                  </div>

                  {step.webSearchResults &&
                    step.webSearchResults.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {step.webSearchResults.map((result) => (
                          <SearchResultPill key={result.link} item={result} />
                        ))}
                      </div>
                    )}
                </TimelineNode>
              )
            })}

            {/* Done node — only when streaming is finished */}
            {!isStreaming && (
              <TimelineNode
                isLast
                icon={
                  <CircleCheckBigIcon
                    size={15}
                    className="text-muted-foreground shrink-0"
                  />
                }
              >
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('thinkingTimeline.done')}
                </p>
              </TimelineNode>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
