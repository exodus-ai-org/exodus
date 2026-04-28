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
    braveApiKey
  }: {
    braveApiKey: string
  }
) {
  return fetchWebSearch({ query, braveApiKey, webSources })
}
