import {
  SettingInput,
  UseFormReturnType
} from '@shared/schemas/settings-schema'
import { Controller, FieldPath } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingRow, SettingSection } from '../../setting-row'

interface ProviderField {
  name: FieldPath<SettingInput>
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
    <SettingSection>
      {fields.map((field, index) => (
        <Controller
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: formField, fieldState }) => (
            <SettingRow
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
            </SettingRow>
          )}
        />
      ))}
    </SettingSection>
  )
}
