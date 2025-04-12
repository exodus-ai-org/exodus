import { fetcher } from '@/lib/utils'
import { BASE_URL } from '@shared/constants'
import { Setting } from '@shared/types/db'
import useSWR from 'swr'

export function useSetting() {
  const { data, error, isLoading, mutate } = useSWR<Setting>(
    `/api/setting`,
    fetcher
  )

  const updateSetting = async (payload: Setting) => {
    const response = await fetch(`${BASE_URL}/api/setting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    await response.json()

    mutate()
  }

  return {
    data,
    isLoading,
    error,
    mutate,
    updateSetting
  }
}
