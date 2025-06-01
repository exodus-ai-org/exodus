export interface WebSearchResult {
  rank: number
  ogImage: string
  type: 'pdf' | 'html'
  link: string
  title: string
  content: string
  snippet: string
}

export interface SearchParameters {
  q: string
  type: string
  engine: string
}

export interface OrganicResult {
  title: string
  link: string
  snippet: string
  position: number
  sitelinks?: {
    title: string
    link: string
  }[]
}

export interface RelatedSearch {
  query: string
}

export interface WebSearchResponse {
  searchParameters: SearchParameters
  organic: OrganicResult[]
  relatedSearches: RelatedSearch[]
  credits: number
}
