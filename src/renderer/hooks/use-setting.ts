import { sileo } from 'sileo'
import type { Setting } from 'src/shared/schemas/setting-schema'
import useSWR from 'swr'

import { updateSetting as updateSettingService } from '@/services/setting'

export function useSetting() {
  const { data, error, isLoading, mutate } = useSWR<Setting>('/api/setting')

  const updateSetting = async (payload: Setting) => {
    await updateSettingService(payload)
    mutate()
    sileo.success({ title: 'Auto saved' })
  }

  return {
    data,
    isLoading,
    error,
    updateSetting
  }
}
