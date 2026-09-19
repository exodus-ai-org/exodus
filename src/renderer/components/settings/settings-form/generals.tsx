import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  LOCALE_IDS,
  LOCALES,
  type LanguageSetting
} from '@exodus/shared/i18n/locales'
import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@/components/ui/switch'
import { setLoginItem, setMenuBar } from '@/lib/ipc'

import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'
import { LockPrivacy } from './lock-privacy'

/** `auto` first (native name resolved from `t()` at render time, paired with
 * a globe rather than any one country's flag), then every concrete locale in
 * its own native name and flag — never translated, since a locale name is
 * that language's own name for itself, not app UI copy. */
const LANGUAGE_OPTIONS: {
  value: LanguageSetting
  nativeName: string | null
  flag: string
}[] = [
  { value: 'auto', nativeName: null, flag: '🌐' },
  ...LOCALE_IDS.map((id) => ({
    value: id,
    nativeName: LOCALES[id].nativeName,
    flag: LOCALES[id].flag
  }))
]

export function General({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  const runOnStartup = form.watch('runOnStartup') ?? false
  const menuBarEnabled = form.watch('menuBar') ?? true
  const language: LanguageSetting = form.watch('language') ?? 'auto'

  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((o) => ({
        value: o.value,
        label: `${o.flag} ${o.nativeName ?? t('general.language.auto')}`
      })),
    [t]
  )

  useEffect(() => {
    setLoginItem(runOnStartup)
  }, [runOnStartup])

  useEffect(() => {
    setMenuBar(menuBarEnabled)
  }, [menuBarEnabled])

  return (
    <>
      <SettingsSection>
        <SettingsRow
          label={t('general.language.label')}
          description={t('general.language.description')}
        >
          <SettingsSelect
            testId={TEST_IDS.settings.languageSelect}
            value={language}
            onValueChange={(v) =>
              form.setValue('language', v as LanguageSetting)
            }
            options={languageOptions}
          />
        </SettingsRow>

        <SettingsRow
          label={t('general.runOnStartup.label')}
          description={t('general.runOnStartup.description')}
        >
          <Switch
            checked={runOnStartup}
            onCheckedChange={(checked) =>
              form.setValue('runOnStartup', checked)
            }
          />
        </SettingsRow>

        <SettingsRow
          label={t('general.menuBar.label')}
          description={t('general.menuBar.description')}
        >
          <Switch
            checked={menuBarEnabled}
            onCheckedChange={(checked) => form.setValue('menuBar', checked)}
          />
        </SettingsRow>
      </SettingsSection>

      <LockPrivacy />
    </>
  )
}
