import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircle } from 'lucide-react'

export function WebSearch({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus supports built-in Web Search using{' '}
          <a
            href="https://serper.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Serper
          </a>{' '}
          to retrieve Google Search results. To utilize the feature, you must
          first register for a <strong>Serper API Key</strong>.
        </AlertDescription>
      </Alert>
      <FormField
        control={form.control}
        name="webSearch.serperApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Serper API Key</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                id="google-search-api-key-input"
                autoFocus
                {...field}
                value={field.value ?? ''}
                required
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
