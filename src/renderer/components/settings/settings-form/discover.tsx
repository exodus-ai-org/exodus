import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { useSetAtom } from 'jotai'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { settingsLabelAtom } from '@/stores/settings'

import { SettingsLabel } from '../settings-menu'
import { SettingsRow, SettingsSection } from '../settings-row'

export function Discover({ form }: { form: UseFormReturnType }) {
  const hasBraveKey = !!form.watch('webSearch.braveApiKey')
  const setActiveSection = useSetAtom(settingsLabelAtom)

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Discover turns your saved Memory into a personalized news feed on the
          home page — enabling it sends your memory topics to your AI provider
          (to turn them into search queries) and the resulting queries to Brave
          (the same provider used for Web Search) roughly once a day. Off by
          default; nothing leaves your machine until you turn it on.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <SettingsRow
          label="Enable Discover"
          description="Show a personalized news feed on the home page."
        >
          <Controller
            control={form.control}
            name="discover.enabled"
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                data-testid={TEST_IDS.discover.enableToggle}
              />
            )}
          />
        </SettingsRow>

        {!hasBraveKey && (
          <p className="text-muted-foreground -mt-1 text-xs">
            Discover needs a Brave Search API key.{' '}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => setActiveSection(SettingsLabel.BuiltinTools)}
            >
              Add one under Built-in Tools
            </button>
            .
          </p>
        )}

        <Controller
          control={form.control}
          name="discover.topicCount"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Topics"
              description="How many memory-derived topics to show. Default 4."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={8}
                className="w-20"
                placeholder="4"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="discover.articlesPerTopic"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Articles per topic"
              description="How many articles per topic row. Default 3."
              error={fieldState.error}
            >
              <Input
                type="number"
                min={1}
                max={5}
                className="w-20"
                placeholder="3"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </SettingsRow>
          )}
        />
      </SettingsSection>
    </>
  )
}
