export interface WebSearchResult {
  rank: number
  ogImage: string
  type: 'pdf' | 'html'
  link: string
  title: string
  content: string
  snippet: string
}

export interface BraveWebResult {
  title: string
  url: string
  description?: string
  extra_snippets?: string[]
}

export interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[]
  }
}
