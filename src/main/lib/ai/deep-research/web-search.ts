import { WebSearchResult } from '@shared/types/web-search'
import { fetchAndProcessSearchResults } from '../utils/web-search-util'

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
  return fetchAndProcessSearchResults({ query, braveApiKey, webSources })
}
