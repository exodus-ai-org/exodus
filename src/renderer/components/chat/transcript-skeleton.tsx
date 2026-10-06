import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useDelayed } from '@/hooks/use-delayed'
import { ENTER } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Line widths of an answer's paragraph, so the shapes read as text. */
const ANSWER = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3']

/**
 * What a chat shows while its first page loads (spec 2026-10-01 §D): the
 * shape of a conversation — a question, an answer — in the reading column,
 * so the page has its layout before its words. Only once it has been slow
 * for 300 ms: on the LAN the page arrives first and nothing flashes.
 */
export function TranscriptSkeleton() {
  const { t } = useTranslation('chat')
  const shown = useDelayed(true)
  if (!shown) return null
  return (
    <div
      role="status"
      aria-label={t('history.loading')}
      className={cn('flex flex-1 flex-col items-center px-16 pt-4', ENTER)}
    >
      <div className="flex w-full flex-col gap-10 md:max-w-3xl">
        {[0, 1].map((turn) => (
          <div key={turn} className="flex flex-col gap-6">
            <Skeleton className="h-10 w-2/5 self-end rounded-br-sm" />
            <div className="flex flex-col gap-2.5">
              {ANSWER.map((width) => (
                <Skeleton
                  key={width}
                  className={cn('h-3.5 rounded-md', width)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
