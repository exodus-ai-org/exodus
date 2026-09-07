import { TEST_IDS } from '@shared/constants/test-ids'
import { getHttpErrorMessage } from '@shared/utils/http'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { SourceFavicon } from '@/components/source-favicon'
import { Button } from '@/components/ui/button'
import { useDiscoverFeed } from '@/hooks/use-discover-feed'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { refreshDiscoverFeed } from '../../services/discover'

export function DiscoverFeed() {
  const { data: settings } = useSettings()
  const enabled = settings?.discover?.enabled ?? false
  const { feed, mutate } = useDiscoverFeed(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const kickedInitialRefresh = useRef(false)

  // First opt-in: the feed row exists but has never been generated. Kick one
  // refresh so the empty home fills in within seconds instead of waiting for
  // the next 30-minute cron sweep. Only from a clean 'idle' state — a 'failed'
  // first attempt is left for the cron to retry, so navigating home can't
  // hammer the provider.
  useEffect(() => {
    if (kickedInitialRefresh.current) return
    if (!enabled || !feed || feed.generatedAt || feed.status !== 'idle') return
    kickedInitialRefresh.current = true
    void mutate(refreshDiscoverFeed(), { revalidate: false }).catch(() => {
      // The feed row records its own failure; nothing actionable here.
    })
  }, [enabled, feed, mutate])

  // Nothing to show until there's at least one group of recommendations —
  // keep the welcome page in its original, uncluttered state otherwise.
  if (!enabled || !feed || feed.groups.length === 0) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await mutate(refreshDiscoverFeed(), { revalidate: false })
    } catch (e) {
      sileo.error({
        title: 'Failed to refresh',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setRefreshing(false)
    }
  }

  const isBusy = refreshing || feed.status === 'refreshing'

  return (
    <div
      className="mt-10 flex flex-col gap-6"
      data-testid={TEST_IDS.discover.section}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Discover
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isBusy}
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCwIcon className={cn('size-4', isBusy && 'animate-spin')} />
        </Button>
      </div>

      {feed.groups.map((group) => (
        <div key={group.memoryId}>
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            {group.topic}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {group.articles.map((article) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-52 shrink-0"
              >
                {article.thumbnail && (
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    <LazyLoadImage
                      src={article.thumbnail}
                      alt={article.title}
                      className="size-full"
                    />
                  </div>
                )}
                <div className="mt-1.5 line-clamp-2 text-sm font-medium">
                  {article.title}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <SourceFavicon
                    link={article.url}
                    favicon={article.favicon}
                    className="size-3.5"
                  />
                  <span className="truncate">{article.source}</span>
                  {article.age && (
                    <span className="shrink-0">· {article.age}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
