import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/settings-schema'

export function AnthropicClaude({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <FormField
        control={form.control}
        name="providers.anthropicApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                id="anthropic-api-key-input"
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
        name="providers.anthropicBaseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base URL</FormLabel>
            <FormControl>
              <Input
                type="text"
                id="anthropic-base-url-input"
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
