import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { Controller } from 'react-hook-form'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const providerOptions = Object.values(AiProviders).map((val) => ({
  value: val,
  label: val
}))

export function ProviderConfig({ form }: { form: UseFormReturnType }) {
  return (
    <SettingsSection>
      <Controller
        control={form.control}
        name="providerConfig.provider"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Provider"
            description="The AI provider to use for chat"
            error={fieldState.error}
          >
            <SettingsSelect
              value={field.value ?? ''}
              onValueChange={(value) => {
                field.onChange(value)
                form.setValue('providerConfig.model', '')
                form.setValue('providerConfig.modelSnapshot', null)
              }}
              options={providerOptions}
              placeholder="Select a provider"
            />
          </SettingsRow>
        )}
      />
    </SettingsSection>
  )
}
