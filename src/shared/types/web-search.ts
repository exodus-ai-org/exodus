export interface WebSearchResult {
  rank: number
  ogImage: string
  link: string
  title: string
  content: string
  snippet: string
  /** Human-readable publisher name from Brave (e.g. "The New York Times"). */
  publisher: string
  /** Brave-served favicon URL for the source. */
  favicon: string
  /** Page age string from Brave (e.g. "9 hours ago"). */
  age?: string
}
