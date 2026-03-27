import type { WebSearchResult } from '@shared/types/web-search'
import { useSetAtom } from 'jotai'
import {
  CheckIcon,
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon
} from 'lucide-react'
import { memo, ReactNode, useCallback, useMemo } from 'react'

import { useClipboard } from '@/hooks/use-clipboard'
import { sourcesPanelAtom } from '@/stores/chat'

import AudioPlayer from './audio-player'
import { Button } from './ui/button'
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
      className="hover:bg-secondary text-muted-foreground flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors duration-150"
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
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
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

export const MessageAction = memo(function MessageAction({
  content,
  regenerate,
  webSearchResults
}: {
  content: string
  regenerate: () => void
  webSearchResults?: WebSearchResult[]
}) {
  const { copied, handleCopy } = useClipboard()
  const setSourcesPanel = useSetAtom(sourcesPanelAtom)

  const onCopy = useCallback(() => handleCopy(content), [handleCopy, content])
  const onSourcesClick = useCallback(
    () =>
      setSourcesPanel({
        webSearchResults: webSearchResults!,
        messageText: content
      }),
    [setSourcesPanel, webSearchResults, content]
  )

  return (
    <TooltipProvider>
      <div className="mt-2 flex items-center gap-1">
        <MessageActionItem tooltipContent="Copy">
          <IconWrapper onClick={onCopy}>
            {copied !== content ? (
              <CopyIcon size={16} />
            ) : (
              <CheckIcon size={16} />
            )}
          </IconWrapper>
        </MessageActionItem>
        <MessageActionItem tooltipContent="Good response">
          <IconWrapper>
            <ThumbsUpIcon size={16} />
          </IconWrapper>
        </MessageActionItem>
        <MessageActionItem tooltipContent="Bad response">
          <IconWrapper>
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
            onClick={onSourcesClick}
          />
        )}
      </div>
    </TooltipProvider>
  )
})
