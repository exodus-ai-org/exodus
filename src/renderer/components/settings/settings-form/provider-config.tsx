import { models } from '@shared/constants/models'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import { useMemo } from 'react'
import { Controller } from 'react-hook-form'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const providerOptions = Object.values(AiProviders).map((val) => ({
  value: val,
  label: val
}))

export function ProviderConfig({ form }: { form: UseFormReturnType }) {
  const provider = form.watch('providerConfig.provider')

  const modelsOfProvider = useMemo(() => {
    if (provider) return models[provider as AiProviders]
    return null
  }, [provider])

  const chatModelOptions = useMemo(
    () =>
      modelsOfProvider?.chatModel?.map((val) => ({ value: val, label: val })) ??
      [],
    [modelsOfProvider]
  )

  const reasoningModelOptions = useMemo(
    () =>
      modelsOfProvider?.reasoningModel?.map((val) => ({
        value: val,
        label: val
      })) ?? [],
    [modelsOfProvider]
  )

  return (
    <SettingsSection>
      <Controller
        control={form.control}
        name="providerConfig.provider"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Provider"
            description="The AI provider to use for chat and reasoning"
            error={fieldState.error}
          >
            <SettingsSelect
              value={field.value ?? ''}
              onValueChange={(value) => {
                field.onChange(value)
                form.setValue('providerConfig.chatModel', '')
                form.setValue('providerConfig.reasoningModel', '')
              }}
              options={providerOptions}
              placeholder="Select a provider"
            />
          </SettingsRow>
        )}
      />
      <Controller
        control={form.control}
        name="providerConfig.chatModel"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Chat Model"
            description="Model used for general conversations"
            error={fieldState.error}
          >
            <SettingsSelect
              disabled={!provider}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              options={chatModelOptions}
              placeholder={
                provider ? 'Select a chat model' : 'Select a provider first'
              }
            />
          </SettingsRow>
        )}
      />
      <Controller
        control={form.control}
        name="providerConfig.reasoningModel"
        render={({ field, fieldState }) => (
          <SettingsRow
            label="Reasoning Model"
            description="Model optimized for complex reasoning tasks"
            error={fieldState.error}
          >
            <SettingsSelect
              disabled={!provider}
              value={field.value ?? ''}
              onValueChange={field.onChange}
              options={reasoningModelOptions}
              placeholder={
                provider
                  ? 'Select a reasoning model'
                  : 'Select a provider first'
              }
            />
          </SettingsRow>
        )}
      />
    </SettingsSection>
  )
}
