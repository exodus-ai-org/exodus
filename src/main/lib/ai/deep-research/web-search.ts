import { WebSearchResult } from '@shared/types/web-search'

import { fetchWebSearch } from '../utils/web-search-util'

export async function webSearch(
  {
    query,
    webSources
  }: {
    query: string
    webSources: Map<string, WebSearchResult>
  },
  {
    perplexityApiKey
  }: {
    perplexityApiKey: string
  }
) {
  return fetchWebSearch({ query, perplexityApiKey, webSources })
}
