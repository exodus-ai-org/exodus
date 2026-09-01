import { HttpError } from '@shared/utils/http'
import { sileo } from 'sileo'
import type { Settings } from 'src/shared/schemas/settings-schema'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

// Backend validation/server errors arrive as HttpError with a specific
// message (e.g. a Zod 400); anything else (network drop, etc.) has no
// message worth surfacing, so the toast falls back to a generic title.
export function resolveSettingsErrorMessage(err: unknown): string | undefined {
  return err instanceof HttpError ? err.message : undefined
}

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSettings = async (payload: Settings) => {
    try {
      await updateSettingsService(payload)
    } catch (err) {
      sileo.error({
        title: 'Failed to save settings',
        description: resolveSettingsErrorMessage(err)
      })
      return
    }
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
