import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import { AlertCircleIcon } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useSettingsTab } from '@/hooks/use-settings-tab'

import { SettingsLabel } from '../settings-menu'
import { SettingsRow, SettingsSection } from '../settings-row'

export function BraveKeyHint({ onNavigate }: { onNavigate: () => void }) {
  return (
    <p className="text-muted-foreground -mt-1 text-xs">
      <Trans ns="discover" i18nKey="braveKeyHint">
        Discover needs a Brave Search API key.{' '}
        <button
          type="button"
          className="text-primary underline underline-offset-2"
          onClick={onNavigate}
        >
          Add one under Built-in Tools
        </button>
        .
      </Trans>
    </p>
  )
}

export function Discover({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('discover')
  const hasBraveKey = !!form.watch('webSearch.braveApiKey')
  const [, setActiveSection] = useSettingsTab()

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">{t('alert')}</AlertDescription>
      </Alert>

      <SettingsSection>
        <SettingsRow
          label={t('enable.label')}
          description={t('enable.description')}
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
          <BraveKeyHint
            onNavigate={() => setActiveSection(SettingsLabel.BuiltinTools)}
          />
        )}

        <Controller
          control={form.control}
          name="discover.topicCount"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('topicCount.label')}
              description={t('topicCount.description')}
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
              label={t('articlesPerTopic.label')}
              description={t('articlesPerTopic.description')}
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
