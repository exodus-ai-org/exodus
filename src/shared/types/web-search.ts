export type WebSearchMediaKind = 'image' | 'video'

export interface WebSearchMediaResult {
  kind: WebSearchMediaKind
  title: string
  url: string
  sourceUrl: string
  thumbnailUrl?: string
  source?: string
  width?: number
  height?: number
  duration?: string
  age?: string
}

export interface WebSearchResult {
  rank: number
  link: string
  title: string
  content: string
  snippet: string
  media?: WebSearchMediaResult[]
}
