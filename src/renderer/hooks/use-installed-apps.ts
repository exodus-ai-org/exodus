import { useQuery } from '@tanstack/react-query'

import { getInstalledApps } from '@/services/computer-use'

export const installedAppsKeys = { all: ['installed-apps'] as const }

/**
 * Installed applications for the Computer Use allowlist picker. Pass
 * `enabled: false` until the picker is actually opened — the underlying
 * `list-apps` call scans the app directories and renders every icon.
 */
export function useInstalledApps(enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: installedAppsKeys.all,
    queryFn: getInstalledApps,
    enabled,
    // The scan is expensive and its failures (missing helper, no permission)
    // are permanent: show the failure once instead of scanning twice.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  })
  return { apps: data?.apps ?? [], isLoading: enabled && isLoading }
}
