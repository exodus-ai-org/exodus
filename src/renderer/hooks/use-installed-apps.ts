import type { InstalledApp } from '@shared/types/computer-use'
import useSWR from 'swr'

/**
 * Installed applications for the Computer Use allowlist picker. Pass
 * `enabled: false` until the picker is actually opened — the underlying
 * `list-apps` call scans the app directories and renders every icon.
 */
export function useInstalledApps(enabled: boolean) {
  const { data, isLoading } = useSWR<{ apps: InstalledApp[] }>(
    enabled ? '/api/computer-use/apps' : null,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )
  return { apps: data?.apps ?? [], isLoading: enabled && isLoading }
}
