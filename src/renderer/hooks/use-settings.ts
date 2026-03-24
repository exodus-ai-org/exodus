import { sileo } from 'sileo'
import type { Settings } from 'src/shared/schemas/settings-schema'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSettings = async (payload: Settings) => {
    await updateSettingsService(payload)
    mutate()
    sileo.success({ title: 'Auto saved' })
  }

  return {
    data,
    isLoading,
    error,
    updateSettings
  }
}
