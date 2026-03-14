import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

export function GoogleMaps({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />

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
      <Controller
        control={form.control}
        name="googleCloud.googleApiKey"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Google API Key</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              id="google-search-api-key-input"
              autoFocus
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
