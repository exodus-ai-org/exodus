import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSetting } from '@/hooks/use-setting'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'

export function Ollama({ form }: { form: UseFormReturnType }) {
  const { data: setting } = useSetting()
  const { error } = useSWR(
    setting?.providers?.ollamaBaseUrl
      ? `/api/tools/ping-ollama?url=${setting?.providers?.ollamaBaseUrl}`
      : null
  )

  return (
    <>
      <Controller
        control={form.control}
        name="providers.ollamaBaseUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Base URL</FieldLabel>
            <Input
              type="text"
              id="ollama-base-url-input"
              placeholder="http://localhost:11434"
              autoFocus
              {...field}
              value={field.value ?? ''}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <FieldLabel>Status</FieldLabel>

      {setting?.providers?.ollamaBaseUrl && error === undefined ? (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <p className="text-sm">Ollama is running.</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <p className="text-sm">Ollama is not running.</p>
        </div>
      )}
    </>
  )
}
