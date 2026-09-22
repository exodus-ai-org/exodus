import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { useTranslation } from 'react-i18next'

import {
  MARKDOWN_ENGINES,
  setMarkdownEngine,
  useMarkdownEngine,
  type MarkdownEngine
} from '@/lib/markdown-engine'

import { SettingsIntro } from '../settings-kit'
import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

/**
 * Settings → Developer → Experiments: switches for things being tried out.
 * They are renderer preferences in this window's localStorage, not Settings
 * rows — nothing here needs the main process or another device.
 */
export function Experiments() {
  const { t } = useTranslation('settings')
  const engine = useMarkdownEngine()

  return (
    <>
      <SettingsIntro>{t('experiments.intro')}</SettingsIntro>

      <SettingsSection>
        <SettingsRow
          label={t('experiments.markdownEngine.label')}
          description={t('experiments.markdownEngine.description')}
        >
          <SettingsSelect
            testId={TEST_IDS.experiments.markdownEngineSelect}
            value={engine}
            onValueChange={(v) => setMarkdownEngine(v as MarkdownEngine)}
            options={MARKDOWN_ENGINES.map((value) => ({
              value,
              label: t(`experiments.markdownEngine.options.${value}`)
            }))}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
