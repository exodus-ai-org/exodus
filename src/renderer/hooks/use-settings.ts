import type { Settings } from '@exodus/shared/schemas/settings-schema'
import { getHttpErrorMessage, toErrorI18n } from '@exodus/shared/utils/http'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import { updateSettings as updateSettingsService } from '@/services/settings'

export function useSettings() {
  const { t, i18n } = useTranslation(['errors', 'settings'])
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings')

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
    sileo.success({ title: t('settings:toast.autoSaved') })
  }

  return {
    data,
    isLoading,
    error,
    updateSettings
  }
}
