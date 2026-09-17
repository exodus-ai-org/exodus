import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function GoogleMaps({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')

  return (
    <SettingsSection plain>
      <Controller
        control={form.control}
        name="googleCloud.googleApiKey"
        render={({ field, fieldState }) => (
          <SettingsRow
            label={t('tools.googleMaps.apiKey.label')}
            description={t('tools.googleMaps.apiKey.description')}
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              placeholder={t('tools.googleMaps.apiKey.placeholder')}
              type="password"
              autoComplete="current-password"
              id="google-search-api-key-input"
              {...field}
              value={field.value ?? ''}
            />
          </SettingsRow>
        )}
      />
    </SettingsSection>
  )
}
