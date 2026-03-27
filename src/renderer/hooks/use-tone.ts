import type { ColorTone } from '@shared/schemas/settings-schema'
import { useCallback, useEffect } from 'react'

import { useSettings } from '@/hooks/use-settings'

const STORAGE_KEY = 'exodus-color-tone'

function applyTone(tone: string) {
  document.documentElement.setAttribute('data-tone', tone)
  localStorage.setItem(STORAGE_KEY, tone)
}

export function useTone() {
  const { data, updateSettings } = useSettings()
  const tone: ColorTone = data?.colorTone ?? 'neutral'

  // Sync data-tone attribute whenever settings change
  useEffect(() => {
    applyTone(tone)
  }, [tone])

  const setTone = useCallback(
    async (newTone: ColorTone) => {
      applyTone(newTone)
      if (data) {
        await updateSettings({ ...data, colorTone: newTone })
      }
    },
    [data, updateSettings]
  )

  return { tone, setTone }
}
