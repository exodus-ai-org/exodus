import { TEST_IDS } from '@shared/constants/test-ids'
import {
  ModelSnapshot,
  SettingsInput,
  UseFormReturnType
} from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { fetcher, getHttpErrorMessage, toErrorI18n } from '@shared/utils/http'
import { useState } from 'react'
import { FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'

import { SettingsRow, SettingsSection } from '../../settings-row'
import { SettingsSelect } from '../../settings-select'

interface FetchedModel {
  id: string
  displayName: string
  snapshot: ModelSnapshot
}

interface ModelPickerProps {
  provider: AiProviders
  form: UseFormReturnType
  apiKeyField: FieldPath<SettingsInput>
  baseUrlField?: FieldPath<SettingsInput>
  /** Azure only — `providers.azureOpenAiApiVersion`. */
  apiVersionField?: FieldPath<SettingsInput>
}

/** Warning shown when the saved model isn't in the freshest fetched list. */
function staleWarning(
  fetched: FetchedModel[] | null,
  savedId: string | null | undefined
): string | undefined {
  if (!fetched || !savedId) return undefined
  if (fetched.some((m) => m.id === savedId)) return undefined
  return `"${savedId}" is no longer offered by this provider — pick a current model.`
}

export function ModelPicker({
  provider,
  form,
  apiKeyField,
  baseUrlField,
  apiVersionField
}: ModelPickerProps) {
  const { i18n } = useTranslation('errors')
  const [fetched, setFetched] = useState<FetchedModel[] | null>(null)
  const [loading, setLoading] = useState(false)

  const apiKey = form.watch(apiKeyField) as string | undefined
  const baseUrl = baseUrlField
    ? (form.watch(baseUrlField) as string | undefined)
    : undefined
  const apiVersion = apiVersionField
    ? (form.watch(apiVersionField) as string | undefined)
    : undefined
  const activeProvider = form.watch('providerConfig.provider')
  const savedModel =
    activeProvider === provider
      ? (form.watch('providerConfig.model') as string | undefined)
      : undefined

  const options =
    fetched?.map((m) => ({ value: m.id, label: m.displayName })) ??
    (savedModel ? [{ value: savedModel, label: savedModel }] : [])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const { models } = await fetcher<{ models: FetchedModel[] }>(
        '/api/settings/models',
        {
          method: 'POST',
          body: { provider, apiKey, baseUrl, apiVersion }
        }
      )
      setFetched(models)
    } catch (error) {
      sileo.error({
        title: 'Could not fetch model list',
        description:
          getHttpErrorMessage(error, toErrorI18n(i18n)) ??
          'Failed to fetch model list'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (id: string) => {
    const model = fetched?.find((m) => m.id === id)
    // All six provider tabs stay navigable regardless of which provider is
    // currently active, but this component only ever shows options for its
    // own `provider` prop. Without this, picking a model from a
    // non-active tab would silently overwrite providerConfig.model with an
    // id that belongs to the wrong provider (the dropdown looks blank
    // because its displayed value is gated on activeProvider === provider,
    // but the write still landed). Selecting a model here always makes this
    // tab's provider the active one, matching provider-config.tsx's own
    // provider-switch handler.
    form.setValue('providerConfig.provider', provider, { shouldDirty: true })
    form.setValue('providerConfig.model', id, { shouldDirty: true })
    form.setValue('providerConfig.modelSnapshot', model?.snapshot ?? null, {
      shouldDirty: true
    })
  }

  return (
    <SettingsSection>
      <SettingsRow label="Model" description="The model used for this provider">
        <div className="flex items-center gap-2">
          <SettingsSelect
            testId={TEST_IDS.providerModels.modelSelect}
            disabled={options.length === 0}
            value={activeProvider === provider ? (savedModel ?? '') : ''}
            onValueChange={handleSelect}
            options={options}
            placeholder={
              fetched
                ? 'Select a model'
                : savedModel
                  ? undefined
                  : 'Click refresh to load models'
            }
          />
          <Button
            type="button"
            variant="outline"
            data-testid={TEST_IDS.providerModels.refreshButton}
            disabled={!apiKey || loading}
            onClick={handleRefresh}
          >
            {loading ? 'Refreshing…' : 'Refresh model list'}
          </Button>
        </div>
        {!fetched && savedModel && (
          <p className="text-muted-foreground text-xs">
            Refresh to see all available models.
          </p>
        )}
        {staleWarning(fetched, savedModel) && (
          <p className="text-destructive text-xs">
            {staleWarning(fetched, savedModel)}
          </p>
        )}
      </SettingsRow>
    </SettingsSection>
  )
}
