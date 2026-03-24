import { UseFormReturnType } from '@shared/schemas/settings-schema'

import { ProviderFields } from './provider-fields'

export function AnthropicClaude({ form }: { form: UseFormReturnType }) {
  return (
    <ProviderFields
      form={form}
      fields={[
        {
          name: 'providers.anthropicApiKey',
          label: 'API Key',
          description: 'Your Anthropic API key',
          placeholder: 'sk-ant-...',
          type: 'password'
        },
        {
          name: 'providers.anthropicBaseUrl',
          label: 'Base URL',
          description: 'Custom API endpoint. Leave empty for default',
          placeholder: 'https://api.anthropic.com'
        }
      ]}
    />
  )
}
