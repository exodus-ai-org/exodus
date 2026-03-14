import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'

export function GoogleGemini({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Controller
        control={form.control}
        name="providers.googleGeminiApiKey"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>API Key</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              id="google-api-key-input"
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
        name="providers.googleGeminiBaseUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Base URL</FieldLabel>
            <Input
              type="text"
              id="google-base-url-input"
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
