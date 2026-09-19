import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  SkillListItem,
  SkillListResponse,
  SkillSearchResponse,
  SkillsView
} from '@exodus/shared/types/skills'
import {
  ChevronDownIcon,
  Loader2Icon,
  SearchXIcon,
  UnplugIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { registryKey, searchKey } from '@/services/skills'

import { SectionLabel } from './section-label'
import {
  ROW_GRID,
  SkillRow,
  SkillRowSkeleton,
  useCompactNumber
} from './skill-row'

const SKELETONS = Array.from({ length: 8 }, (_, i) => i)

interface Ranked {
  item: SkillListItem
  rank: number
}

/**
 * Consecutive rows from one repo collapse behind the first one, the way
 * skills.sh's leaderboard does — a hot repo can otherwise fill a whole page
 * with near-identical entries. Ranks stay global (1, 2, +3 more, 6, …).
 */
interface RowGroup {
  head: Ranked
  rest: Ranked[]
  total: number
}

function groupBySource(items: SkillListItem[], collapse: boolean): RowGroup[] {
  const groups: RowGroup[] = []
  items.forEach((item, i) => {
    const ranked = { item, rank: i + 1 }
    const last = groups[groups.length - 1]
    if (collapse && last && last.head.item.source === item.source) {
      last.rest.push(ranked)
      last.total += item.installs
    } else {
      groups.push({ head: ranked, rest: [], total: item.installs })
    }
  })
  return groups
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(['settings', 'common'])
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UnplugIcon />
        </EmptyMedia>
        <EmptyTitle>{t('skillsMarket.browse.loadFailed')}</EmptyTitle>
        <EmptyDescription>
          {t('skillsMarket.browse.loadFailedHint')}
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('common:action.retry')}
      </Button>
    </Empty>
  )
}

function Skeletons({ count }: { count: number }) {
  return (
    <div className="divide-border divide-y">
      {SKELETONS.slice(0, count).map((i) => (
        <SkillRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function LeaderboardTable({
  items,
  installedSlugs,
  showActivity,
  collapseSources,
  onOpen
}: {
  items: SkillListItem[]
  installedSlugs: Set<string>
  showActivity: boolean
  collapseSources: boolean
  onOpen: (item: SkillListItem) => void
}) {
  const { t } = useTranslation('settings')
  const compact = useCompactNumber()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const groups = useMemo(
    () => groupBySource(items, collapseSources),
    [items, collapseSources]
  )

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const row = ({ item, rank }: Ranked) => (
    <SkillRow
      key={item.id}
      item={item}
      rank={rank}
      installed={installedSlugs.has(item.slug)}
      showActivity={showActivity}
      onOpen={onOpen}
    />
  )

  return (
    <div className="divide-border flex flex-col divide-y">
      <div className={cn(ROW_GRID, 'pb-2')}>
        <SectionLabel>{t('skillsMarket.leaderboard.rank')}</SectionLabel>
        <SectionLabel>{t('skillsMarket.leaderboard.skill')}</SectionLabel>
        <SectionLabel className="justify-self-end">
          {showActivity ? t('skillsMarket.leaderboard.activity') : ''}
        </SectionLabel>
        <SectionLabel className="justify-self-end">
          {t('skillsMarket.leaderboard.installs')}
        </SectionLabel>
      </div>
      {groups.map((group) => {
        const id = group.head.item.id
        const open = expanded.has(id)
        return (
          <div key={id} className="divide-border flex flex-col divide-y">
            {row(group.head)}
            {group.rest.length > 0 && (
              <>
                {open && group.rest.map(row)}
                <button
                  type="button"
                  data-testid={TEST_IDS.skillsMarket.expandGroupButton}
                  onClick={() => toggle(id)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-2.5 pl-11 text-left font-mono text-xs transition-colors"
                >
                  {open
                    ? t('skillsMarket.browse.lessFromSource', {
                        source: group.head.item.source
                      })
                    : t('skillsMarket.browse.moreFromSource', {
                        count: group.rest.length,
                        source: group.head.item.source,
                        total: compact(group.total)
                      })}
                  <ChevronDownIcon
                    className={cn(
                      'size-3.5 transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SearchResults({
  query,
  installedSlugs,
  onOpen
}: {
  query: string
  installedSlugs: Set<string>
  onOpen: (item: SkillListItem) => void
}) {
  const { t } = useTranslation('settings')
  const { data, error, isLoading, mutate } = useSWR<SkillSearchResponse>(
    searchKey(query)
  )

  if (isLoading) return <Skeletons count={5} />
  if (error) return <LoadFailed onRetry={() => mutate()} />
  if (!data || data.data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>
            {t('skillsMarket.browse.noResults', { query })}
          </EmptyTitle>
          <EmptyDescription>
            {t('skillsMarket.browse.noResultsHint')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground font-mono text-xs">
        {t('skillsMarket.browse.resultCount', { count: data.data.length })}
      </p>
      <LeaderboardTable
        items={data.data}
        installedSlugs={installedSlugs}
        showActivity={false}
        collapseSources={false}
        onOpen={onOpen}
      />
    </div>
  )
}

export function RegistryLeaderboard({
  view,
  installedSlugs,
  onOpen
}: {
  view: SkillsView
  installedSlugs: Set<string>
  onOpen: (item: SkillListItem) => void
}) {
  const { t } = useTranslation('settings')
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<SkillListResponse>((index) => registryKey(view, index), {
      revalidateFirstPage: false
    })

  const items = useMemo(() => {
    const seen = new Set<string>()
    const out: SkillListItem[] = []
    for (const page of data ?? []) {
      for (const item of page.data) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        out.push(item)
      }
    }
    return out
  }, [data])
  const hasMore = data?.[data.length - 1]?.pagination.hasMore ?? false
  const loadingMore = isValidating && size > 1

  if (isLoading) return <Skeletons count={8} />
  if (error && items.length === 0) {
    return <LoadFailed onRetry={() => mutate()} />
  }
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('skillsMarket.browse.empty')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LeaderboardTable
        items={items}
        installedSlugs={installedSlugs}
        showActivity={view !== 'all-time'}
        collapseSources
        onOpen={onOpen}
      />
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            data-testid={TEST_IDS.skillsMarket.loadMoreButton}
            disabled={loadingMore}
            onClick={() => setSize(size + 1)}
          >
            {loadingMore && <Loader2Icon className="animate-spin" />}
            {t('skillsMarket.browse.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
