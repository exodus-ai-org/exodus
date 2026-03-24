import { UseFormReturnType } from '@shared/schemas/setting-schema'

import { ProviderFields } from './provider-fields'

export function GoogleGemini({ form }: { form: UseFormReturnType }) {
  return (
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
  )
}
