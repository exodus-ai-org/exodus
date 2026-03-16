export interface WebSearchResult {
  rank: number
  ogImage: string
  type: 'pdf' | 'html'
  link: string
  title: string
  content: string
  snippet: string
}

export interface PerplexitySearchResult {
  title: string
  url: string
  snippet: string
  date?: string
  last_updated?: string
}

export interface PerplexitySearchResponse {
  results: PerplexitySearchResult[]
  id: string
}
