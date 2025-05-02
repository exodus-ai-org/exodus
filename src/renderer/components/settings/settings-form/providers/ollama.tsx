import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/hooks/use-settings'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import useSWR from 'swr'

export function Ollama({ form }: { form: UseFormReturnType }) {
  const { data: settings } = useSettings()
  const { error } = useSWR(
    settings?.providers?.ollamaBaseUrl
      ? `/api/ollama/ping?url=${settings?.providers?.ollamaBaseUrl}`
      : null
  )

  return (
    <>
      <FormField
        control={form.control}
        name="providers.ollamaBaseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base URL</FormLabel>
            <FormControl>
              <Input
                type="text"
                id="ollama-base-url-input"
                placeholder="http://localhost:11434"
                autoFocus
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormLabel>Status</FormLabel>

      {settings?.providers?.ollamaBaseUrl && error === undefined ? (
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
