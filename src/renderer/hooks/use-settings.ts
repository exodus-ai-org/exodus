import { updateSetting as updateSettingService } from '@/services/settings'
import { Settings } from '@shared/types/db'
import { toast } from 'sonner'
import useSWR from 'swr'

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

  const updateSetting = async (payload: Settings) => {
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
