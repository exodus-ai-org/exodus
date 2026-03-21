import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingRow, SettingSection } from '../../setting-row'

export function GoogleGemini({ form }: { form: UseFormReturnType }) {
  return (
    <SettingSection>
      <Controller
        control={form.control}
        name="providers.googleGeminiApiKey"
        render={({ field, fieldState }) => (
          <SettingRow
            label="API Key"
            description="Your Google Gemini API key"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="AIza..."
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="providers.googleGeminiBaseUrl"
        render={({ field, fieldState }) => (
          <SettingRow
            label="Base URL"
            description="Custom API endpoint. Leave empty for default"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="https://generativelanguage.googleapis.com"
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
    </SettingSection>
  )
}
