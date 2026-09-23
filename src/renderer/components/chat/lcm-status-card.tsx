import { CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'
import { useLcmStatus, type LcmStatusState } from '@/hooks/use-lcm-status'
import { ENTER_UP } from '@/lib/motion'
import { cn } from '@/lib/utils'

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** How long the card takes to fade once its state has gone back to idle. */
const EXIT_MS = 150

/**
 * The state as shown: the last non-idle state lingers for `EXIT_MS` after
 * the hook goes idle, marked `leaving`, so the card can fade out instead of
 * vanishing — a mount/unmount cannot animate its own exit.
 */
function useLingeringState(state: LcmStatusState): {
  shown: Exclude<LcmStatusState, { kind: 'idle' }> | null
  leaving: boolean
} {
  const last = useRef<Exclude<LcmStatusState, { kind: 'idle' }> | null>(null)
  const [leaving, setLeaving] = useState(false)
  if (state.kind !== 'idle') last.current = state

  useEffect(() => {
    if (state.kind !== 'idle') {
      setLeaving(false)
      return
    }
    if (!last.current) return
    setLeaving(true)
    const timer = setTimeout(() => {
      last.current = null
      setLeaving(false)
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [state])

  return { shown: state.kind === 'idle' ? last.current : state, leaving }
}

export function LcmStatusCard({ chatId }: { chatId: string }) {
  const { t } = useTranslation('chat')
  const { shown, leaving } = useLingeringState(useLcmStatus(chatId))

  if (!shown) return null

  // A frosted strip over whatever is behind it (it sits above the floating
  // composer, over the transcript): rises in, fades out.
  const surface = cn(
    ENTER_UP,
    'mx-auto my-2 flex w-[calc(100%-8rem)] items-center gap-2 rounded-xl border px-3 py-2 text-xs backdrop-blur-md md:max-w-3xl',
    leaving && 'opacity-0'
  )

  if (shown.kind === 'error') {
    return (
      <div
        role="status"
        className={cn(
          surface,
          'border-destructive/30 bg-destructive/10 text-destructive'
        )}
      >
        <TriangleAlertIcon className="size-3.5 shrink-0" />
        <span>{t('lcm.compactionFailed')}</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      className={cn(
        surface,
        'border-border/50 bg-background/70 text-muted-foreground'
      )}
    >
      {shown.kind === 'running' ? (
        <>
          <Spinner className="size-3.5 shrink-0" />
          <span>{t('lcm.compacting')}</span>
        </>
      ) : (
        <>
          <CheckIcon className="size-3.5 shrink-0" />
          <span>
            {t('lcm.compactedSummary', {
              count: Math.max(
                0,
                shown.payload.messagesBefore - shown.payload.messagesAfter
              ),
              tokens: formatTokens(shown.payload.tokensSaved)
            })}
          </span>
        </>
      )}
    </div>
  )
}
