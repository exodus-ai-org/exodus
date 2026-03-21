import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

import { Input } from '@/components/ui/input'

import { SettingRow, SettingSection } from '../../setting-row'

export function AnthropicClaude({ form }: { form: UseFormReturnType }) {
  return (
    <SettingSection>
      <Controller
        control={form.control}
        name="providers.anthropicApiKey"
        render={({ field, fieldState }) => (
          <SettingRow
            label="API Key"
            description="Your Anthropic API key"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="sk-ant-..."
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="providers.anthropicBaseUrl"
        render={({ field, fieldState }) => (
          <SettingRow
            label="Base URL"
            description="Custom API endpoint. Leave empty for default"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="https://api.anthropic.com"
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
    </SettingSection>
  )
}
