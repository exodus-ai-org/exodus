export interface DiscoverArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  /** Human freshness label from Brave at generation time, e.g. "10 hours ago". */
  age?: string
  /** ISO timestamp — render a live relative time from this when present. */
  publishedAt?: string
}

export interface DiscoverGroup {
  memoryId: string
  topic: string
  query: string
  articles: DiscoverArticle[]
}

export interface DiscoverFeedDto {
  groups: DiscoverGroup[]
  generatedAt: string | null
  status: 'idle' | 'refreshing' | 'failed'
  error: string | null
}
