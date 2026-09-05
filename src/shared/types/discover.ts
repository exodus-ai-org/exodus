export interface DiscoverArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  age?: string
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
}
