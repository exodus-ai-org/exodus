import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'

import { ModelPicker } from './model-picker'
import { ProviderFields } from './provider-fields'

export function GoogleGemini({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <ProviderFields
        form={form}
        fields={[
          {
            name: 'providers.googleGeminiApiKey',
            label: 'API Key',
            description: 'Your Google Gemini API key',
            placeholder: 'AIza...',
            type: 'password'
          },
          {
            name: 'providers.googleGeminiBaseUrl',
            label: 'Base URL',
            description: 'Custom API endpoint. Leave empty for default',
            placeholder: 'https://generativelanguage.googleapis.com'
          }
        ]}
      />
      <ModelPicker
        provider={AiProviders.GoogleGemini}
        form={form}
        apiKeyField="providers.googleGeminiApiKey"
        baseUrlField="providers.googleGeminiBaseUrl"
      />
    </>
  )
}
