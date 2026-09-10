import { TEST_IDS } from '@shared/constants/test-ids'
import type { DiscoverArticle, DiscoverGroup } from '@shared/types/discover'
import { getHttpErrorMessage } from '@shared/utils/http'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCwIcon } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
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
    <div className="bg-muted relative h-[4.5rem] w-28 shrink-0 overflow-hidden rounded-lg">
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
            className="size-5 opacity-40 grayscale"
          />
        </div>
      )}
    </div>
  )
}

/**
 * One article link. Memoised so a state change on `<DiscoverFeed>` (the refresh
 * spinner toggling) doesn't re-render every row — `article` refs are stable
 * across a refresh until the new feed resolves.
 */
const ArticleRow = memo(function ArticleRow({
  article
}: {
  article: DiscoverArticle
}) {
  const age = articleAge(article)
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-muted/40 -mx-2 flex gap-3.5 rounded-lg px-2 py-3 transition-colors"
    >
      <DiscoverThumb article={article} />
      <div className="min-w-0 flex-1">
        <div className="group-hover:text-foreground/80 line-clamp-2 text-[15px] leading-snug font-medium transition-colors">
          {article.title}
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
          <SourceFavicon
            link={article.url}
            favicon={article.favicon}
            className="size-3.5"
          />
          <span className="truncate">{article.source}</span>
          {age && <span className="shrink-0">· {age}</span>}
        </div>
      </div>
    </a>
  )
})

const TopicSection = memo(function TopicSection({
  group
}: {
  group: DiscoverGroup
}) {
  return (
    <section className="mt-5 first:mt-2">
      <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
        {group.topic}
      </p>
      <div className="flex flex-col">
        {group.articles.map((article) => (
          <ArticleRow key={article.url} article={article} />
        ))}
      </div>
    </section>
  )
})

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
  const updatedAgo =
    feed.generatedAt && !Number.isNaN(new Date(feed.generatedAt).getTime())
      ? formatDistanceToNow(new Date(feed.generatedAt), { addSuffix: true })
      : null

  return (
    <div className="mt-6" data-testid={TEST_IDS.discover.section}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-2xl font-bold tracking-tight">Discover</h2>
          {updatedAgo && (
            <span className="text-muted-foreground text-xs">
              updated {updatedAgo}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={isBusy}
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCwIcon className={cn('size-4', isBusy && 'animate-spin')} />
        </Button>
      </div>

      {feed.groups.map((group) => (
        <TopicSection key={group.memoryId} group={group} />
      ))}
    </div>
  )
}
