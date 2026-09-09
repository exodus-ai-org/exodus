import { faviconUrl } from '@shared/constants/external-urls'
import type { WebSearchResult } from '@shared/types/web-search'
import { useSetAtom } from 'jotai'
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'

import { useClipboard } from '@/hooks/use-clipboard'
import { sourcesPanelAtom } from '@/stores/chat'

import AudioPlayer from './audio-player'
import { IconWrapper, MessageActionItem } from './message-action-primitives'
import { Button } from './ui/button'
import { TooltipProvider } from './ui/tooltip'

// Re-export so existing callers of massage-action keep working.
export { IconWrapper, MessageActionItem }

/** Wall-clock a turn took, compact. Sub-second is dropped — message
 *  timestamps mark stream START, so short durations are unreliable
 *  (same rule as the thinking timeline). */
function formatGenTime(ms?: number): string | null {
  if (!ms || !Number.isFinite(ms) || ms < 1000) return null
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s` : `${m}m`
}

// ─── Sources Button ─────────────────────────────────────────────────────────

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
        result.push(faviconUrl(origin))
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
      className="text-muted-foreground hover:text-foreground h-7 gap-1.5 rounded-lg px-2 text-xs"
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
  webSearchResults,
  durationMs
}: {
  content: string
  regenerate: () => void
  webSearchResults?: WebSearchResult[]
  durationMs?: number
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

  const genTime = formatGenTime(durationMs)
  const hasSources = !!webSearchResults && webSearchResults.length > 0

  return (
    <TooltipProvider>
      <div className="text-muted-foreground mt-1.5 flex items-center gap-0.5">
        <MessageActionItem tooltipContent="Copy">
          <IconWrapper onClick={onCopy}>
            {copied !== content ? <CopyIcon /> : <CheckIcon />}
          </IconWrapper>
        </MessageActionItem>

        <AudioPlayer content={content} />

        <MessageActionItem tooltipContent="Regenerate">
          <IconWrapper onClick={regenerate}>
            <RefreshCwIcon />
          </IconWrapper>
        </MessageActionItem>

        {hasSources && (
          <SourcesButton
            webSearchResults={webSearchResults!}
            onClick={onSourcesClick}
          />
        )}

        {genTime && (
          <span className="text-muted-foreground/50 ml-1.5 shrink-0 text-xs tabular-nums">
            {genTime}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
})
