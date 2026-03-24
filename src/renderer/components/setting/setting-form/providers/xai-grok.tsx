import { UseFormReturnType } from '@shared/schemas/setting-schema'

import { ProviderFields } from './provider-fields'

export function XaiGrok({ form }: { form: UseFormReturnType }) {
  return (
    <ProviderFields
      form={form}
      fields={[
        {
          name: 'providers.xAiApiKey',
          label: 'API Key',
          description: 'Your xAI API key',
          placeholder: 'xai-...',
          type: 'password'
        },
        {
          name: 'providers.xAiBaseUrl',
          label: 'Base URL',
          description: 'Custom API endpoint. Leave empty for default',
          placeholder: 'https://api.x.ai/v1'
        }
      ]}
    />
  )
}
