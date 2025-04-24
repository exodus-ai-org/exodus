import { BASE_URL } from '@shared/constants'
import { Settings } from '@shared/types/db'
import useSWR from 'swr'

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Settings>(`/api/settings`)

  const updateSetting = async (payload: Settings) => {
    const response = await fetch(`${BASE_URL}/api/settings`, {
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
