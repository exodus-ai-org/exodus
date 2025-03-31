import { fetcher } from '@/lib/utils'
import { Setting } from 'src/main/lib/db/schema'
import useSWR from 'swr'

export function useSetting() {
  const { data, error, isLoading, mutate } = useSWR<Setting>(
    `/api/setting`,
    fetcher
  )

  const updateSetting = async (payload: Setting) => {
    const response = await fetch('http://localhost:8964/api/setting', {
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
