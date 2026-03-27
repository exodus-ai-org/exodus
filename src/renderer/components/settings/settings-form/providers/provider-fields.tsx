import {
  SettingsInput,
  UseFormReturnType
} from '@shared/schemas/settings-schema'
import { Controller, FieldPath } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../../settings-row'

interface ProviderField {
  name: FieldPath<SettingsInput>
  label: string
  description: string
  placeholder?: string
  type?: 'text' | 'password'
}

interface ProviderFieldsProps {
  form: UseFormReturnType
  fields: ProviderField[]
}

export function ProviderFields({ form, fields }: ProviderFieldsProps) {
  return (
    <SettingsSection>
      {fields.map((field, index) => (
        <Controller
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: formField, fieldState }) => (
            <SettingsRow
              label={field.label}
              description={field.description}
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type={field.type ?? 'text'}
                autoComplete={
                  field.type === 'password' ? 'current-password' : undefined
                }
                placeholder={field.placeholder}
                autoFocus={index === 0}
                {...formField}
                value={formField.value ?? ''}
              />
            </SettingsRow>
          )}
        />
      ))}
    </SettingsSection>
  )
}
