import {
  GOOGLE_MAPS_PLACES_DOCS,
  GOOGLE_MAPS_ROUTES_DOCS
} from '@shared/constants/external-urls'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function GoogleMaps({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />

        <AlertDescription className="inline">
          Exodus offers two built-in calling tools powered by Google Maps:{' '}
          <a
            href={GOOGLE_MAPS_ROUTES_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Google Maps Routing
          </a>
          , which helps you find the best directions from point A to point B.
          And{' '}
          <a
            href={GOOGLE_MAPS_PLACES_DOCS}
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
      <SettingsSection>
        <Controller
          control={form.control}
          name="googleCloud.googleApiKey"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Google API Key"
              description="Your Google Cloud API key for Maps Routing and Places services."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                placeholder="Enter your Google API key"
                type="password"
                autoComplete="current-password"
                id="google-search-api-key-input"
                autoFocus
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />
      </SettingsSection>
    </>
  )
}
