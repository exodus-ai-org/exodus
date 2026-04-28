import { sileo } from 'sileo'
import type { Settings } from 'src/shared/schemas/settings-schema'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSettings = async (payload: Settings) => {
    await updateSettingsService(payload)
    // Optimistically merge the just-saved payload into the local SWR cache
    // without revalidating. A revalidation (`mutate()` with no args) would
    // re-GET /api/settings and bring back a freshly-bumped `updatedAt`,
    // which echoes through `useForm({ values: settings })` → RHF resets
    // form → watch fires for the timestamp field → autosave fires again
    // → infinite POST/GET loop.
    await mutate(
      (current) => ({ ...(current as Settings), ...payload }) as Settings,
      { revalidate: false }
    )
    sileo.success({ title: 'Auto saved' })
  }

  return {
    data,
    isLoading,
    error,
    updateSettings
  }
}
