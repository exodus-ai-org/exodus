import type { DiscoverFeedDto } from '@exodus/shared/types/discover'
import { fetcher } from '@exodus/shared/utils/http'

export const getDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/v1/discover')

export const refreshDiscoverFeed = () =>
  fetcher<DiscoverFeedDto>('/api/v1/discover/refresh', { method: 'POST' })
