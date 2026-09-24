import { useQuery } from '@tanstack/react-query'

import { getUsageSummary } from '@/services/usage'

export const usageKeys = { all: ['usage'] as const }

export function useUsage() {
  const { data, isLoading } = useQuery({
    queryKey: usageKeys.all,
    queryFn: getUsageSummary
  })
  return { data, isLoading }
}
