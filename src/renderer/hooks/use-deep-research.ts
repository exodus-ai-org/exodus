import { useQuery } from '@tanstack/react-query'

import { fetchDeepResearchResult } from '@/services/deep-research'

export const deepResearchKeys = {
  result: (id: string) => ['deep-research', 'result', id] as const
}

/**
 * One deep-research job's row. The Deep Research card and the process panel
 * both read it, on one key, so they share a single request.
 *
 * `refetch` is the observer's own function: stable across renders, which
 * `DeepResearchProcess`'s SSE effect relies on (it lists it as a dependency,
 * and a new function per render would reopen the stream on every render).
 * Return it as-is — never wrap it in an inline function or spread the query.
 */
export function useDeepResearchResult(id: string | undefined) {
  const { data, refetch } = useQuery({
    queryKey: deepResearchKeys.result(id ?? ''),
    queryFn: () => fetchDeepResearchResult(id!),
    enabled: !!id
  })
  return { data, refetch }
}
