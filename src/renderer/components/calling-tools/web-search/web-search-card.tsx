import { WebSearchResultWithoutTokenCount } from '@shared/types/web-search'
import { useEffect, useState } from 'react'
import { WebSearchGroup } from './web-search-group'

export function WebSearchCard({ toolResult }: { toolResult: string }) {
  const [dataSource, setDataSource] = useState<
    WebSearchResultWithoutTokenCount[] | null
  >(null)

  useEffect(() => {
    try {
      setDataSource(JSON.parse(toolResult))
    } catch {
      // Do nothing...
    }
  }, [toolResult])

  if (!dataSource) return null

  return <WebSearchGroup webSearchResults={dataSource} variant="overlapping" />
}
