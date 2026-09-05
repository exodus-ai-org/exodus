import type { DiscoverFeedDto } from '@shared/types/discover'
import { fetcher } from '@shared/utils/http'

export const getDiscoverFeed = () => fetcher<DiscoverFeedDto>('/api/discover')

export const refreshDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/discover/refresh', { method: 'POST' })
