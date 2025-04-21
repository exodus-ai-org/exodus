import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import { UseFormReturnType } from '../settings-form'

export function GoogleCloud({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />

        <AlertDescription className="inline">
          Exodus supports three built-in calling tools powered by Google Cloud:{' '}
          <a
            href="https://developers.google.com/maps/documentation/routes/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Maps Routing
          </a>
          ,{' '}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Maps Places
          </a>{' '}
          and{' '}
          <a
            href="https://developers.google.com/custom-search/v1/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Custom Search
          </a>
          . To utilize those features, you must register a{' '}
          <strong>Google API Key</strong>. Additionally, if you wish to use Web
          Search, you will need to register a <strong>Google CSE ID</strong>.
        </AlertDescription>
      </Alert>
      <FormField
        control={form.control}
        name="googleApiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Google API Key</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                id="google-search-api-key-input"
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
        name="googleCseId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Google CSE ID</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                id="google-cse-id-input"
                autoFocus
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
