import { CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusStrip } from '@/components/app/status-strip'
import { Spinner } from '@/components/ui/spinner'
import { useLcmStatus, type LcmStatusState } from '@/hooks/use-lcm-status'

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

  // Sits above the floating composer, over the transcript: rises in, fades out.
  const place = 'mx-auto my-2 w-[calc(100%-8rem)] md:max-w-3xl'

  if (shown.kind === 'error') {
    return (
      <StatusStrip
        role="status"
        tone="destructive"
        leaving={leaving}
        className={place}
        icon={<TriangleAlertIcon className="size-3.5 shrink-0" />}
      >
        <span>{t('lcm.compactionFailed')}</span>
      </StatusStrip>
    )
  }

  return (
    <StatusStrip
      role="status"
      leaving={leaving}
      className={place}
      icon={
        shown.kind === 'running' ? (
          <Spinner className="size-3.5 shrink-0" />
        ) : (
          <CheckIcon className="size-3.5 shrink-0" />
        )
      }
    >
      {shown.kind === 'running' ? (
        <span>{t('lcm.compacting')}</span>
      ) : (
        <span>
          {t('lcm.compactedSummary', {
            count: Math.max(
              0,
              shown.payload.messagesBefore - shown.payload.messagesAfter
            ),
            tokens: formatTokens(shown.payload.tokensSaved)
          })}
        </span>
      )}
    </StatusStrip>
  )
}
