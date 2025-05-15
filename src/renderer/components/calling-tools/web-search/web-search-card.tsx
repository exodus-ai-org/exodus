import { WebSearchResult } from '@shared/types/web-search'
import { WebSearchGroup } from './web-search-group'

export function WebSearchCard({
  toolResult
}: {
  toolResult: WebSearchResult[]
}) {
  return <WebSearchGroup webSearchResults={toolResult} variant="overlapping" />
}
