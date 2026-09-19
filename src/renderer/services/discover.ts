import type { DiscoverFeedDto } from '@exodus/shared/types/discover'
import { fetcher } from '@exodus/shared/utils/http'

export const getDiscoverFeed = () => fetcher<DiscoverFeedDto>('/api/discover')

export const refreshDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/discover/refresh', { method: 'POST' })
