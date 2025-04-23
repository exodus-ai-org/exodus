import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '../../settings-form'

export function AzureOpenAi({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <FormField
        control={form.control}
        name="azureOpenaiApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                id="azure-openai-api-key-input"
                autoFocus
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="azureOpenAiEndpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endpoint</FormLabel>
            <FormControl>
              <Input
                type="text"
                id="azure-openai-endpoint"
                placeholder="https://{resourceName}.openai.azure.com/openai/deployments/{modelId}{path}"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="azureOpenAiApiVersion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Version</FormLabel>
            <FormControl>
              <Input
                type="text"
                id="azure-openai-api-version"
                placeholder="2024-12-01-preview"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
