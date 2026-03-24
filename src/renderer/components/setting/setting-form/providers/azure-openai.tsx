import { UseFormReturnType } from '@shared/schemas/setting-schema'

import { ProviderFields } from './provider-fields'

export function AzureOpenAi({ form }: { form: UseFormReturnType }) {
  return (
    <ProviderFields
      form={form}
      fields={[
        {
          name: 'providers.azureOpenaiApiKey',
          label: 'API Key',
          description: 'Your Azure OpenAI API key',
          type: 'password'
        },
        {
          name: 'providers.azureOpenAiEndpoint',
          label: 'Endpoint',
          description: 'Your Azure OpenAI resource endpoint URL',
          placeholder:
            'https://{resource}.openai.azure.com/openai/deployments/{model}'
        },
        {
          name: 'providers.azureOpenAiApiVersion',
          label: 'API Version',
          description: 'Azure OpenAI API version string',
          placeholder: '2024-12-01-preview'
        }
      ]}
    />
  )
}
