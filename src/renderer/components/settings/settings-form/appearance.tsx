import type { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import { useTranslation } from 'react-i18next'

import { SettingsRow, SettingsSection } from '../settings-row'
import { FontsSection } from './appearance/fonts-section'
import { SchemeCard } from './appearance/scheme-card'
import { ThemeModeSwitcher } from './appearance/theme-mode-switcher'
import { useAppearanceForm } from './appearance/use-appearance-form'
import { WindowSection } from './appearance/window-section'

/**
 * Settings → Appearance. Mode (next-themes), one card per colour scheme,
 * fonts, window. Every control writes the whole `settings.appearance` object
 * through `useAppearanceForm`, and `AppearanceProvider` re-skins the app the
 * moment the autosave lands.
 */
export function Appearance({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  const { appearance, update } = useAppearanceForm(form)

  return (
    <>
      <SettingsSection>
        <SettingsRow
          label={t('general.theme.label')}
          description={t('general.theme.description')}
        >
          <ThemeModeSwitcher />
        </SettingsRow>
      </SettingsSection>

      <SchemeCard
        slot="light"
        scheme={appearance.light}
        onChange={(light) => update({ light })}
      />
      <SchemeCard
        slot="dark"
        scheme={appearance.dark}
        onChange={(dark) => update({ dark })}
      />

      <FontsSection appearance={appearance} update={update} />
      <WindowSection appearance={appearance} update={update} />
    </>
  )
}
