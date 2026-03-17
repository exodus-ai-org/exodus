export interface WebSearchResult {
  rank: number
  ogImage: string
  type: 'pdf' | 'html'
  link: string
  title: string
  content: string
  snippet: string
}
