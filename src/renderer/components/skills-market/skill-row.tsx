import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { SkillListItem } from '@exodus/shared/types/skills'
import { CircleCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useFormat } from '@/lib/format'

export function useCompactNumber() {
  const { number } = useFormat()
  return (n: number) =>
    number(n, { notation: 'compact', maximumFractionDigits: 1 })
}

/** Rank · name + source · activity · installs — one leaderboard line. */
export const ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)_5.5rem_6rem] items-center gap-3'

export function SkillRowSkeleton() {
  return (
    <div className={`${ROW_GRID} py-3`}>
      <Skeleton className="h-3 w-4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-10 justify-self-end" />
      <Skeleton className="h-3 w-12 justify-self-end" />
    </div>
  )
}

export function SkillRow({
  item,
  rank,
  installed,
  showActivity,
  onOpen
}: {
  item: SkillListItem
  rank: number
  installed: boolean
  /** Hot / Trending views carry a daily delta worth showing. */
  showActivity: boolean
  onOpen: (item: SkillListItem) => void
}) {
  const { t } = useTranslation('settings')
  const compact = useCompactNumber()
  const delta = showActivity && item.change && item.change > 0 ? item.change : 0

  return (
    <button
      type="button"
      data-testid={TEST_IDS.skillsMarket.row}
      onClick={() => onOpen(item)}
      className={`${ROW_GRID} hover:bg-muted/40 focus-visible:bg-muted/40 w-full py-3 text-left transition-colors focus-visible:outline-none`}
    >
      <span className="text-muted-foreground font-mono text-sm tabular-nums">
        {rank}
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-sm font-semibold">{item.name}</span>
        <span className="text-muted-foreground truncate font-mono text-xs">
          {item.source}
        </span>
      </span>
      <span className="justify-self-end font-mono text-xs text-emerald-600 tabular-nums dark:text-emerald-400">
        {delta
          ? t('skillsMarket.card.trend', { formatted: compact(delta) })
          : ''}
      </span>
      <span className="inline-flex items-center justify-end gap-1.5 justify-self-end font-mono text-sm tabular-nums">
        {installed && (
          <CircleCheckIcon
            className="text-foreground size-3.5"
            aria-label={t('skillsMarket.card.installedBadge')}
          />
        )}
        {compact(item.installs)}
      </span>
    </button>
  )
}
