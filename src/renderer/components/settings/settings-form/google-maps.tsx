import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { Controller } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function GoogleMaps({ form }: { form: UseFormReturnType }) {
  return (
    <SettingsSection plain>
      <Controller
        control={form.control}
        name="googleCloud.googleApiKey"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Google API Key"
            description="Powers Maps Routing (point-to-point directions) and Places (location lookup). Get one from the Google Cloud console."
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              placeholder="Enter your Google API key"
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
