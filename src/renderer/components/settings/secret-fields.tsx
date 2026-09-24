import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  SettingsInput,
  UseFormReturnType
} from '@exodus/shared/schemas/settings-schema'
import { useAtom } from 'jotai'
import type React from 'react'
import { useState } from 'react'
import { type FieldPath, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import { useSecretsStatus } from '@/hooks/use-secrets-status'
import { ENTER } from '@/lib/motion'
import { destinationSecretOf, looksLikeMask, replaceMask } from '@/lib/secrets'
import { cn } from '@/lib/utils'
import { clearedSecretsAtom } from '@/stores/secrets'

type SecretInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'name'
> & {
  /** The settings path (`providers.openaiApiKey`). */
  name: string
  value: string | null | undefined
  onChange: (value: string) => void
}

/**
 * A stored key's input. The API hands a saved key out as its mask
 * (`•••• abcd`), shown as text so its last four read; typing replaces the
 * whole mask, deleting from it clears the key. The autosave posts whatever
 * the field holds — an untouched mask means "unchanged" to the server. A key
 * the user types is a password field as before.
 */
export function SecretInput({
  name,
  value,
  onChange,
  onFocus,
  ...props
}: SecretInputProps) {
  const { t } = useTranslation('settings')
  const [cleared, setCleared] = useAtom(clearedSecretsAtom)
  const { data: status } = useSecretsStatus()
  const masked = looksLikeMask(value)
  const needsKey =
    !value && (cleared.includes(name) || !!status?.needsReentry.includes(name))

  return (
    <>
      <InputGroup>
        <InputGroupInput
          {...props}
          name={name}
          type={masked ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={value ?? ''}
          data-testid={TEST_IDS.secrets.keyInput}
          data-field={name}
          data-masked={masked || undefined}
          onFocus={(e) => {
            // Selected, so the first key typed (or a paste) replaces the mask.
            if (masked) e.currentTarget.select()
            onFocus?.(e)
          }}
          onChange={(e) => {
            const next = masked
              ? replaceMask(value, e.target.value)
              : e.target.value
            if (next && cleared.includes(name)) {
              setCleared((prev) => prev.filter((p) => p !== name))
            }
            onChange(next)
          }}
        />
        {masked && (
          <InputGroupAddon align="inline-end">
            <InputGroupText className="text-xs">
              {t('secrets.input.saved')}
            </InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {needsKey && (
        <p
          className={cn('text-destructive text-xs', ENTER)}
          data-testid={TEST_IDS.secrets.reenterPrompt}
        >
          {t('secrets.input.reenter')}
        </p>
      )}
    </>
  )
}

type AddressInputProps = Omit<React.ComponentProps<typeof Input>, 'form'> & {
  settingsForm: UseFormReturnType
  /** The address field's settings path (`providers.openaiBaseUrl`). */
  name: FieldPath<SettingsInput>
  /** From the Controller's `fieldState`: an edit not saved yet. */
  isDirty?: boolean
}

/**
 * The address a stored key is sent to (a provider base URL, the Azure
 * endpoint, Elasticsearch, LightRAG). Changing it while the key is saved
 * clears the key on save (it never follows a new host), so the field says so
 * from the moment it is focused — before the save, not after.
 */
export function AddressInput({
  settingsForm,
  name,
  isDirty,
  onFocus,
  onBlur,
  ...props
}: AddressInputProps) {
  const { t } = useTranslation('settings')
  const [focused, setFocused] = useState(false)
  const secret = destinationSecretOf(name)
  const key = useWatch({
    control: settingsForm.control,
    name: (secret ?? name) as FieldPath<SettingsInput>
  })
  const showHint = !!secret && looksLikeMask(key) && (focused || !!isDirty)

  return (
    <>
      <Input
        {...props}
        name={name}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
      />
      {showHint && (
        <p
          className={cn('text-muted-foreground text-xs', ENTER)}
          data-testid={TEST_IDS.secrets.destinationHint}
        >
          {t('secrets.destinationHint')}
        </p>
      )}
    </>
  )
}
