import type { WebSearchResult } from '@shared/types/web-search'
import {
  CheckIcon,
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon
} from 'lucide-react'
import { ReactNode, useMemo, useState } from 'react'

import { useClipboard } from '@/hooks/use-clipboard'
import { cn } from '@/lib/utils'

import AudioPlayer from './audio-player'
import { parseCitations } from './markdown'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function IconWrapper({
  onClick,
  children
}: {
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <span
      className="hover:bg-secondary text-muted-foreground flex size-6 items-center justify-center rounded-sm"
      onClick={onClick}
    >
      {children}
    </span>
  )
}

export function MessageActionItem({
  children,
  tooltipContent
}: {
  children: ReactNode
  tooltipContent: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Sources Sheet ──────────────────────────────────────────────────────────

function SourceLink({ item }: { item: WebSearchResult }) {
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
      className="hover:bg-accent flex gap-3 rounded-lg px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm leading-snug font-semibold">
          {item.title}
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          {favicon && (
            <Avatar className="size-3.5">
              <AvatarImage src={favicon} alt={hostname} />
              <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <span className="truncate">{hostname}</span>
        </div>
        {item.snippet && (
          <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">
            {item.snippet}
          </div>
        )}
      </div>
    </a>
  )
}

function SourcesSheet({
  webSearchResults,
  messageText,
  onClose
}: {
  webSearchResults: WebSearchResult[]
  messageText: string
  onClose: () => void
}) {
  const citedRanks = useMemo(
    () => new Set(parseCitations(messageText) ?? []),
    [messageText]
  )
  const cited = webSearchResults.filter((r) => citedRanks.has(r.rank))
  const more = webSearchResults.filter((r) => !citedRanks.has(r.rank))

  return (
    <section
      className={cn(
        'bg-background fixed top-0 right-0 z-50 flex h-svh w-100 flex-col border-l shadow-lg'
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-sm font-semibold">
          {webSearchResults.length} Sources
        </h2>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          onClick={onClose}
        >
          <XIcon data-icon className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {cited.length > 0 && (
          <>
            <p className="mb-2 px-3 text-xs font-semibold">Citations</p>
            <div className="flex flex-col gap-0.5">
              {cited.map((item) => (
                <SourceLink key={item.link} item={item} />
              ))}
            </div>
          </>
        )}
        {more.length > 0 && (
          <>
            {cited.length > 0 && <Separator className="my-3" />}
            <p className="mb-2 px-3 text-xs font-semibold">More</p>
            <div className="flex flex-col gap-0.5">
              {more.map((item) => (
                <SourceLink key={item.link} item={item} />
              ))}
            </div>
          </>
        )}
        {cited.length === 0 && more.length === 0 && (
          <div className="flex flex-col gap-0.5">
            {webSearchResults.map((item) => (
              <SourceLink key={item.link} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Stacked Favicons Button ────────────────────────────────────────────────

function SourcesButton({
  webSearchResults,
  onClick
}: {
  webSearchResults: WebSearchResult[]
  onClick: () => void
}) {
  const favicons = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const r of webSearchResults) {
      try {
        const origin = new URL(r.link).origin
        if (seen.has(origin)) continue
        seen.add(origin)
        result.push(
          `https://www.google.com/s2/favicons?domain=${origin}&sz=128`
        )
        if (result.length >= 3) break
      } catch {
        // skip
      }
    }
    return result
  }, [webSearchResults])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground h-6 gap-1.5 rounded-full px-2.5 text-xs"
    >
      <span className="*:ring-background flex gap-[-0.375rem] *:ring-2">
        {favicons.map((src, i) => (
          <img key={i} src={src} className="size-3.5 rounded-full" alt="" />
        ))}
      </span>
      Sources
    </Button>
  )
}

// ─── MessageAction ──────────────────────────────────────────────────────────

export function MessageAction({
  content,
  regenerate,
  webSearchResults
}: {
  content: string
  regenerate: () => void
  webSearchResults?: WebSearchResult[]
}) {
  const { copied, handleCopy } = useClipboard()
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <>
      <div className="mt-2 flex items-center gap-1">
        <MessageActionItem tooltipContent="Copy">
          <IconWrapper onClick={() => handleCopy(content)}>
            {copied !== content ? (
              <CopyIcon size={16} />
            ) : (
              <CheckIcon size={16} />
            )}
          </IconWrapper>
        </MessageActionItem>
        <MessageActionItem tooltipContent="Good response">
          <IconWrapper onClick={() => {}}>
            <ThumbsUpIcon size={16} />
          </IconWrapper>
        </MessageActionItem>
        <MessageActionItem tooltipContent="Bad response">
          <IconWrapper onClick={() => {}}>
            <ThumbsDownIcon size={16} />
          </IconWrapper>
        </MessageActionItem>
        <AudioPlayer content={content} />
        <MessageActionItem tooltipContent="Switch model">
          <IconWrapper onClick={regenerate}>
            <RefreshCcwIcon size={16} />
          </IconWrapper>
        </MessageActionItem>
        {webSearchResults && webSearchResults.length > 0 && (
          <SourcesButton
            webSearchResults={webSearchResults}
            onClick={() => setSourcesOpen(true)}
          />
        )}
      </div>

      {sourcesOpen && webSearchResults && (
        <SourcesSheet
          webSearchResults={webSearchResults}
          messageText={content}
          onClose={() => setSourcesOpen(false)}
        />
      )}
    </>
  )
}
