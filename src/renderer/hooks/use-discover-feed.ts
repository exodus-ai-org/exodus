import type { DiscoverFeedDto } from '@shared/types/discover'
import useSWR from 'swr'

// While a refresh is running, poll so the freshly generated groups appear
// without a manual reload.
const REFRESHING_POLL_MS = 3000

/**
 * Shared read of the Home Discover feed. `messages.tsx` uses it to decide
 * whether the landing screen has feed content to show (which drives the
 * greeting layout), and `DiscoverFeed` uses it to render the feed itself —
 * one SWR key, so both consumers share a single request and cache entry.
 *
 * Pass `enabled: false` to stand the hook down entirely (no request) when the
 * user hasn't opted into Discover or the route isn't the true home.
 */
export function useDiscoverFeed(enabled: boolean) {
  const { data, mutate } = useSWR<DiscoverFeedDto>(
    enabled ? '/api/discover' : null,
    {
      refreshInterval: (latest) =>
        latest?.status === 'refreshing' ? REFRESHING_POLL_MS : 0
    }
  )

  return { feed: data ?? null, mutate }
}
