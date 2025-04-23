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

export function GoogleMaps({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />

        <AlertDescription className="inline">
          Exodus offers two built-in calling tools powered by Google Maps:{' '}
          <a
            href="https://developers.google.com/maps/documentation/routes/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Maps Routing
          </a>
          , which helps you find the best directions from point A to point B.
          And{' '}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Maps Places
          </a>
          , which helps you find detailed information about specific locations.
          To utilize those features, you must register for a{' '}
          <strong>Google API Key</strong>.
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
    </>
  )
}
