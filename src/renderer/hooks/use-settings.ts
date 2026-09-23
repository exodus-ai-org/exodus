import type { Settings } from '@exodus/shared/schemas/settings-schema'
import {
  fetcher,
  getHttpErrorMessage,
  toErrorI18n
} from '@exodus/shared/utils/http'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { updateSettings as updateSettingsService } from '@/services/settings'

export const settingsKeys = { all: ['settings'] as const }

export function useSettings() {
  const { t, i18n } = useTranslation(['errors', 'settings'])
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => fetcher<Settings>('/api/v1/settings')
  })

  const updateSettings = async (payload: Settings) => {
    try {
      await updateSettingsService(payload)
    } catch (err) {
      sileo.error({
        title: t('settings:toast.saveFailed'),
        description: getHttpErrorMessage(err, toErrorI18n(i18n))
      })
      return
    }
    // Write the just-saved payload into the cache without refetching. A
    // revalidating GET (`invalidateQueries`) would bring back a freshly-bumped
    // `updatedAt`, which echoes through `useForm({ values: settings })` → RHF
    // resets the form → watch fires for the timestamp field → autosave fires
    // again → infinite POST/GET loop.
    queryClient.setQueryData(
      settingsKeys.all,
      (current: Settings | undefined) =>
        ({ ...current, ...payload }) as Settings
    )
    sileo.success({ title: t('settings:toast.autoSaved') })
  }

  return {
    data,
    isLoading,
    error,
    updateSettings
  }
}
