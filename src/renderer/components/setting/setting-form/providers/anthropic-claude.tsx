import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

export function AnthropicClaude({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Controller
        control={form.control}
        name="providers.anthropicApiKey"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>API Key</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              id="anthropic-api-key-input"
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
        name="providers.anthropicBaseUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Base URL</FieldLabel>
            <Input
              type="text"
              id="anthropic-base-url-input"
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
