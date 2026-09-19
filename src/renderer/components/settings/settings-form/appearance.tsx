import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import { useTranslation } from 'react-i18next'

import { SettingsRow, SettingsSection } from '../settings-row'
import { ThemeModeSwitcher } from './appearance/theme-mode-switcher'

export function Appearance({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  void form
  return (
    <SettingsSection>
      <SettingsRow
        label={t('general.theme.label')}
        description={t('general.theme.description')}
      >
        <ThemeModeSwitcher />
      </SettingsRow>
    </SettingsSection>
  )
}
