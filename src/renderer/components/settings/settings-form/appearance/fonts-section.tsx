import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type {
  Appearance,
  ContentFontSetting,
  FontFamilyId,
  FontWeightId
} from '@exodus/shared/schemas/settings-schema'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../../settings-row'
import { SettingsSelect } from '../../settings-select'

const FAMILIES: FontFamilyId[] = [
  'system',
  'serif',
  'mono',
  'rounded',
  'custom'
]
const WEIGHTS: FontWeightId[] = ['light', 'regular', 'medium']

/** UI font + content font (family, weight, and a name field for Custom). */
export function FontsSection({
  appearance,
  update
}: {
  appearance: Appearance
  update: (patch: Partial<Appearance>) => void
}) {
  const { t } = useTranslation('settings')
  const { uiFont, contentFont } = appearance

  const familyOptions = (withUi: boolean) =>
    [...(withUi ? (['ui'] as const) : []), ...FAMILIES].map((id) => ({
      value: id,
      label: t(`appearance.fonts.families.${id}` as ParseKeys<'settings'>)
    }))
  const weightOptions = WEIGHTS.map((id) => ({
    value: id,
    label: t(`appearance.fonts.weights.${id}`)
  }))

  return (
    <SettingsSection title={t('appearance.fonts.title')}>
      <SettingsRow
        label={t('appearance.fonts.ui.label')}
        description={t('appearance.fonts.ui.description')}
      >
        <div className="flex items-center gap-2">
          <SettingsSelect
            testId={TEST_IDS.appearance.uiFontSelect}
            value={uiFont.family}
            onValueChange={(v) =>
              update({ uiFont: { ...uiFont, family: v as FontFamilyId } })
            }
            options={familyOptions(false)}
          />
          <SettingsSelect
            testId={TEST_IDS.appearance.uiFontWeight}
            value={uiFont.weight}
            onValueChange={(v) =>
              update({ uiFont: { ...uiFont, weight: v as FontWeightId } })
            }
            options={weightOptions}
          />
        </div>
      </SettingsRow>

      {uiFont.family === 'custom' && (
        <SettingsRow
          label={t('appearance.fonts.customFamily.label')}
          description={t('appearance.fonts.customFamily.description')}
        >
          <Input
            data-testid={TEST_IDS.appearance.customFontInput}
            className="w-48"
            value={uiFont.customFamily ?? ''}
            placeholder={t('appearance.fonts.customFamily.placeholder')}
            onChange={(e) =>
              update({ uiFont: { ...uiFont, customFamily: e.target.value } })
            }
          />
        </SettingsRow>
      )}

      <SettingsRow
        label={t('appearance.fonts.content.label')}
        description={t('appearance.fonts.content.description')}
      >
        <div className="flex items-center gap-2">
          <SettingsSelect
            testId={TEST_IDS.appearance.contentFontSelect}
            value={contentFont.family}
            onValueChange={(v) =>
              update({
                contentFont: {
                  ...contentFont,
                  family: v as ContentFontSetting['family']
                }
              })
            }
            options={familyOptions(true)}
          />
          <SettingsSelect
            testId={TEST_IDS.appearance.contentFontWeight}
            value={
              contentFont.family === 'ui' ? uiFont.weight : contentFont.weight
            }
            disabled={contentFont.family === 'ui'}
            onValueChange={(v) =>
              update({
                contentFont: { ...contentFont, weight: v as FontWeightId }
              })
            }
            options={weightOptions}
          />
        </div>
      </SettingsRow>

      {contentFont.family === 'custom' && (
        <SettingsRow
          label={t('appearance.fonts.customFamily.label')}
          description={t('appearance.fonts.customFamily.description')}
        >
          <Input
            data-testid={`${TEST_IDS.appearance.customFontInput}-content`}
            className="w-48"
            value={contentFont.customFamily ?? ''}
            placeholder={t('appearance.fonts.customFamily.placeholder')}
            onChange={(e) =>
              update({
                contentFont: { ...contentFont, customFamily: e.target.value }
              })
            }
          />
        </SettingsRow>
      )}
    </SettingsSection>
  )
}
