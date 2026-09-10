import { TEST_IDS } from '@shared/constants/test-ids'
import type { DiscoverArticle } from '@shared/types/discover'
import { getHttpErrorMessage } from '@shared/utils/http'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'

import { SourceFavicon } from '@/components/source-favicon'
import { Button } from '@/components/ui/button'
import { useDiscoverFeed } from '@/hooks/use-discover-feed'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { refreshDiscoverFeed } from '../../services/discover'

/**
 * `publishedAt` (ISO) gets a live relative label so a card cached for ~20h
 * doesn't keep saying "2 hours ago". Falls back to Brave's `age` string.
 */
function articleAge(article: DiscoverArticle): string | null {
  if (article.publishedAt) {
    const d = new Date(article.publishedAt)
    if (!Number.isNaN(d.getTime())) {
      return formatDistanceToNow(d, { addSuffix: true })
    }
  }
  return article.age ?? null
}

/**
 * Article thumbnail. News-site images regularly 404, hotlink-block, or reject
 * the app's `Referer` — the slot always renders (so cards stay a uniform
 * height) and falls back to the source favicon on a muted tile.
 */
function DiscoverThumb({ article }: { article: DiscoverArticle }) {
  const [failed, setFailed] = useState(false)
  const showImg = !!article.thumbnail && !failed

  return (
    <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
      {showImg ? (
        <img
          src={article.thumbnail}
          alt={article.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <SourceFavicon
            link={article.url}
            favicon={article.favicon}
            className="size-7 opacity-40 grayscale"
          />
        </div>
      )}
    </div>
  )
}

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
                className="group w-52 shrink-0 self-start"
              >
                <DiscoverThumb article={article} />
                <div className="group-hover:text-foreground/80 mt-1.5 line-clamp-2 text-sm font-medium transition-colors">
                  {article.title}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <SourceFavicon
                    link={article.url}
                    favicon={article.favicon}
                    className="size-3.5"
                  />
                  <span className="truncate">{article.source}</span>
                  {articleAge(article) && (
                    <span className="shrink-0">· {articleAge(article)}</span>
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
