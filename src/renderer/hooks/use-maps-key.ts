import { useQuery } from '@tanstack/react-query'

import { useSettings } from '@/hooks/use-settings'
import { fetchMapsJsKey } from '@/lib/maps-key'

export const mapsKeyKeys = {
  all: ['maps-js-key'] as const,
  /** Keyed by the masked key the settings show, so a new key is asked for. */
  forMask: (mask: string) => ['maps-js-key', mask] as const
}

/**
 * The Maps JS key for the map card: `undefined` while it is being asked for,
 * `null` when none is set (or this window is refused it), else the key. The
 * settings API shows only its mask — enough to know whether one is set, and
 * to ask again when it changes.
 */
export function useMapsJsKey(): string | null | undefined {
  const { data: settings } = useSettings()
  const mask = settings?.googleCloud?.googleApiKey || null
  const { data } = useQuery({
    queryKey: mapsKeyKeys.forMask(mask ?? ''),
    queryFn: () => fetchMapsJsKey(),
    enabled: mask !== null,
    staleTime: Infinity
  })
  if (settings === undefined) return undefined
  if (mask === null) return null
  return data
}
