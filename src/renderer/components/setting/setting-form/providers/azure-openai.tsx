import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

export function AzureOpenAi({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Controller
        control={form.control}
        name="providers.azureOpenaiApiKey"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>API Key</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              id="azure-openai-api-key-input"
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="providers.azureOpenAiEndpoint"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Endpoint</FieldLabel>
            <Input
              type="text"
              id="azure-openai-endpoint"
              placeholder="https://{resourceName}.openai.azure.com/openai/deployments/{modelId}{path}"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="providers.azureOpenAiApiVersion"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>API Version</FieldLabel>
            <Input
              type="text"
              id="azure-openai-api-version"
              placeholder="2024-12-01-preview"
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  )
}
