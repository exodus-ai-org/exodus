import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'
import { SettingRow, SettingSection } from '../../setting-row'

export function OpenAiGpt({ form }: { form: UseFormReturnType }) {
  return (
    <SettingSection>
      <Controller
        control={form.control}
        name="providers.openaiApiKey"
        render={({ field, fieldState }) => (
          <SettingRow
            label="API Key"
            description="Your OpenAI API key"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="sk-..."
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="providers.openaiBaseUrl"
        render={({ field, fieldState }) => (
          <SettingRow
            label="Base URL"
            description="Custom API endpoint. Leave empty for default"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="https://api.openai.com/v1"
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
    </SettingSection>
  )
}
