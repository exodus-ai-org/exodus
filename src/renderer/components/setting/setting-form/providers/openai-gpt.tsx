import { UseFormReturnType } from '@shared/schemas/setting-schema'

import { ProviderFields } from './provider-fields'

export function OpenAiGpt({ form }: { form: UseFormReturnType }) {
  return (
    <ProviderFields
      form={form}
      fields={[
        {
          name: 'providers.openaiApiKey',
          label: 'API Key',
          description: 'Your OpenAI API key',
          placeholder: 'sk-...',
          type: 'password'
        },
        {
          name: 'providers.openaiBaseUrl',
          label: 'Base URL',
          description: 'Custom API endpoint. Leave empty for default',
          placeholder: 'https://api.openai.com/v1'
        }
      ]}
    />
  )
}
