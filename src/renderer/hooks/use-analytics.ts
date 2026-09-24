import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAnalyticsStatus } from '@/services/analytics'

export const analyticsKeys = { status: ['analytics', 'status'] as const }

export function useAnalyticsStatus() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.status,
    queryFn: getAnalyticsStatus
  })
  // Returned so `await refresh()` waits for the refetch to complete.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: analyticsKeys.status })
  return { data, isLoading, refresh }
}
