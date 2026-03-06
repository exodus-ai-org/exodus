import { updateSetting as updateSettingService } from '@/services/setting'
import { toast } from 'sonner'
import type { Setting } from 'src/shared/schemas/setting-schema'
import useSWR from 'swr'

export function useSetting() {
  const { data, error, isLoading, mutate } = useSWR<Setting>('/api/setting')

  const updateSetting = async (payload: Setting) => {
    await updateSettingService(payload)
    mutate()
    toast.success('Auto saved.')
  }

  return {
    data,
    isLoading,
    error,
    updateSetting
  }
}
