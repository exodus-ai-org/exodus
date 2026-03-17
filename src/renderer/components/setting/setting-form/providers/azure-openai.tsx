import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'
import { SettingRow, SettingSection } from '../../setting-row'

export function AzureOpenAi({ form }: { form: UseFormReturnType }) {
  return (
    <SettingSection>
      <Controller
        control={form.control}
        name="providers.azureOpenaiApiKey"
        render={({ field, fieldState }) => (
          <SettingRow
            label="API Key"
            description="Your Azure OpenAI API key"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="password"
              autoComplete="current-password"
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="providers.azureOpenAiEndpoint"
        render={({ field, fieldState }) => (
          <SettingRow
            label="Endpoint"
            description="Your Azure OpenAI resource endpoint URL"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="https://{resource}.openai.azure.com/openai/deployments/{model}"
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
      <Controller
        control={form.control}
        name="providers.azureOpenAiApiVersion"
        render={({ field, fieldState }) => (
          <SettingRow
            label="API Version"
            description="Azure OpenAI API version string"
            error={fieldState.error}
            layout="vertical"
          >
            <Input
              type="text"
              placeholder="2024-12-01-preview"
              {...field}
              value={field.value ?? ''}
            />
          </SettingRow>
        )}
      />
    </SettingSection>
  )
}
