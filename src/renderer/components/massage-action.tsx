import { faviconUrl } from '@exodus/shared/constants/external-urls'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { useSetAtom } from 'jotai'
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useClipboard } from '@/hooks/use-clipboard'
import { compactRelativeTime } from '@/lib/relative-time'
import { sourcesPanelAtom } from '@/stores/chat'

import AudioPlayer from './audio-player'
import { IconWrapper, MessageActionItem } from './message-action-primitives'
import { Button } from './ui/button'
import { TooltipProvider } from './ui/tooltip'

// Re-export so existing callers of massage-action keep working.
export { IconWrapper, MessageActionItem }

// ─── Sources Button ─────────────────────────────────────────────────────────

function SourcesButton({
  webSearchResults,
  onClick
}: {
  webSearchResults: WebSearchResult[]
  onClick: () => void
}) {
  const { t } = useTranslation('chat')
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
      {t('messageAction.sources')}
    </Button>
  )
}

// ─── MessageAction ──────────────────────────────────────────────────────────

export const MessageAction = memo(function MessageAction({
  content,
  regenerate,
  webSearchResults,
  timestamp
}: {
  content: string
  regenerate: () => void
  webSearchResults?: WebSearchResult[]
  /** When the reply was generated (epoch ms). Shown as a compact relative
   *  time, matching the sidebar. */
  timestamp?: number
}) {
  const { t } = useTranslation('chat')
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

  const relTime = timestamp ? compactRelativeTime(new Date(timestamp)) : null
  const hasSources = !!webSearchResults && webSearchResults.length > 0

  return (
    <TooltipProvider>
      <div className="text-muted-foreground mt-1.5 flex items-center gap-0.5">
        <MessageActionItem tooltipContent={t('messageAction.copy')}>
          <IconWrapper onClick={onCopy}>
            {copied !== content ? <CopyIcon /> : <CheckIcon />}
          </IconWrapper>
        </MessageActionItem>

        <AudioPlayer content={content} />

        <MessageActionItem tooltipContent={t('messageAction.regenerate')}>
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

        {relTime && (
          <span className="text-muted-foreground/50 ml-1.5 shrink-0 text-xs tabular-nums">
            {relTime}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
})
