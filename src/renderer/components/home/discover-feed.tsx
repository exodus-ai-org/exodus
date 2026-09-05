import { TEST_IDS } from '@shared/constants/test-ids'
import type { DiscoverFeedDto } from '@shared/types/discover'
import { getHttpErrorMessage } from '@shared/utils/http'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { SourceFavicon } from '@/components/source-favicon'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { getDiscoverFeed, refreshDiscoverFeed } from '../../services/discover'

const POLL_MS = 3000

export function DiscoverFeed() {
  const { data: settings } = useSettings()
  const [feed, setFeed] = useState<DiscoverFeedDto | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const enabled = settings?.discover?.enabled ?? false

  useEffect(() => {
    if (!enabled) return
    getDiscoverFeed().then(setFeed)
  }, [enabled])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (enabled && feed?.status === 'refreshing') {
      pollRef.current = setInterval(() => {
        getDiscoverFeed().then(setFeed)
      }, POLL_MS)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [enabled, feed?.status])

  if (!enabled || !feed) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      setFeed(await refreshDiscoverFeed())
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

      {feed.groups.length > 0 ? (
        feed.groups.map((group) => (
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
        ))
      ) : feed.status === 'failed' ? (
        <p
          className="text-muted-foreground text-sm"
          title={feed.error ?? undefined}
        >
          Couldn't refresh Discover.
        </p>
      ) : !feed.generatedAt ? (
        <p className="text-muted-foreground text-sm">Discover is warming up…</p>
      ) : (
        <p className="text-muted-foreground text-sm">
          No recommendations right now.
        </p>
      )}
    </div>
  )
}
