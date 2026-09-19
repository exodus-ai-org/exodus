import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { Appearance } from '@exodus/shared/schemas/settings-schema'
import { useTranslation } from 'react-i18next'

import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { isMacRenderer } from '@/lib/appearance'

import { SettingsRow, SettingsSection } from '../../settings-row'

/** Translucent sidebar (macOS only — vibrancy) and the contrast slider. */
export function WindowSection({
  appearance,
  update
}: {
  appearance: Appearance
  update: (patch: Partial<Appearance>) => void
}) {
  const { t } = useTranslation('settings')
  const isMac = isMacRenderer()

  return (
    <SettingsSection title={t('appearance.window.title')}>
      {isMac && (
        <SettingsRow
          label={t('appearance.window.translucentSidebar.label')}
          description={t('appearance.window.translucentSidebar.description')}
        >
          <Switch
            data-testid={TEST_IDS.appearance.translucentSidebar}
            checked={appearance.translucentSidebar}
            onCheckedChange={(checked) =>
              update({ translucentSidebar: checked })
            }
          />
        </SettingsRow>
      )}
      <SettingsRow
        label={t('appearance.window.contrast.label')}
        description={t('appearance.window.contrast.description')}
      >
        <div className="flex w-56 items-center gap-3">
          <Slider
            data-testid={TEST_IDS.appearance.contrastSlider}
            min={0}
            max={100}
            step={5}
            value={[appearance.contrast]}
            onValueChange={(v) =>
              update({ contrast: Array.isArray(v) ? v[0] : v })
            }
          />
          <span className="text-muted-foreground w-8 text-right text-sm tabular-nums">
            {appearance.contrast}
          </span>
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
