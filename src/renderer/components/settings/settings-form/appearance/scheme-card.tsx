import {
  CUSTOM_PRESET_ID,
  NAMED_ACCENTS,
  findPreset,
  type SchemeColors,
  type SchemeSlot
} from '@exodus/shared/constants/appearance'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { AppearanceScheme } from '@exodus/shared/schemas/settings-schema'
import {
  exportScheme,
  isSchemeCustomized,
  resolveScheme
} from '@exodus/shared/utils/appearance'
import { contrastRatio } from '@exodus/shared/utils/color'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { Card } from '@/components/ui/card'

import { SettingsRow } from '../../settings-row'
import { SettingsSelect } from '../../settings-select'
import { ColorField } from './color-field'
import { SchemeCardHeader } from './scheme-card-header'
import { ThemeImportDialog } from './theme-import-dialog'

const ACCENT_PRESET = 'preset'
const ACCENT_CUSTOM = 'custom'
const AA = 4.5

function accentMode(scheme: AppearanceScheme, slot: SchemeSlot): string {
  if (scheme.accent === null || scheme.accent === undefined) {
    return ACCENT_PRESET
  }
  return (
    NAMED_ACCENTS.find((a) => a[slot] === scheme.accent)?.id ?? ACCENT_CUSTOM
  )
}

/**
 * One colour scheme (the Light or the Dark card): preset picker, the three
 * editable colours, import / copy. The preset is the base; each colour is an
 * optional override on top of it. Accent is its own axis (named accents), so
 * a custom accent does NOT flip the preset dropdown to "Custom" — an edited
 * background or foreground does.
 */
export function SchemeCard({
  slot,
  scheme,
  onChange
}: {
  slot: SchemeSlot
  scheme: AppearanceScheme
  onChange: (next: AppearanceScheme) => void
}) {
  const { t } = useTranslation('settings')
  const [importOpen, setImportOpen] = useState(false)
  const resolved = resolveScheme(scheme, slot)
  const presetValue = isSchemeCustomized(scheme)
    ? CUSTOM_PRESET_ID
    : scheme.preset
  const accentValue = accentMode(scheme, slot)
  const ratio = contrastRatio(resolved.foreground, resolved.background)

  const accentOptions = [
    { value: ACCENT_PRESET, label: t('appearance.scheme.presetDefault') },
    ...NAMED_ACCENTS.map((a) => ({
      value: a.id,
      label: t(`appearance.scheme.accents.${a.id}`)
    })),
    { value: ACCENT_CUSTOM, label: t('appearance.scheme.custom') }
  ]

  const onAccentMode = (mode: string) => {
    if (mode === ACCENT_PRESET) {
      onChange({ ...scheme, accent: null })
      return
    }
    if (mode === ACCENT_CUSTOM) {
      onChange({ ...scheme, accent: resolved.accent })
      return
    }
    const named = NAMED_ACCENTS.find((a) => a.id === mode)
    if (named) onChange({ ...scheme, accent: named[slot] })
  }

  const copyTheme = async () => {
    const name =
      presetValue === CUSTOM_PRESET_ID
        ? t('appearance.scheme.custom')
        : findPreset(scheme.preset).name
    try {
      await navigator.clipboard.writeText(exportScheme(resolved, name))
      sileo.success({ title: t('appearance.toast.copied') })
    } catch {
      sileo.error({ title: t('appearance.toast.copyFailed') })
    }
  }

  const importTheme = (colors: SchemeColors) => {
    onChange({ preset: CUSTOM_PRESET_ID, ...colors })
    sileo.success({ title: t('appearance.toast.imported') })
  }

  const colorTestId = (field: keyof SchemeColors) =>
    `${TEST_IDS.appearance.colorInput}-${slot}-${field}`

  return (
    <Card className="divide-border gap-0 divide-y px-3 py-0 *:px-2.5 *:py-4">
      <SchemeCardHeader
        slot={slot}
        resolved={resolved}
        presetValue={presetValue}
        onPreset={(id) =>
          onChange({
            preset: id,
            accent: null,
            background: null,
            foreground: null
          })
        }
        onImport={() => setImportOpen(true)}
        onCopy={() => void copyTheme()}
      />

      <SettingsRow label={t('appearance.scheme.accent')}>
        <div className="flex items-center gap-2">
          <SettingsSelect
            testId={`${TEST_IDS.appearance.accentSelect}-${slot}`}
            value={accentValue}
            onValueChange={onAccentMode}
            options={accentOptions}
          />
          <ColorField
            value={resolved.accent}
            disabled={accentValue !== ACCENT_CUSTOM}
            testId={colorTestId('accent')}
            ariaLabel={t('appearance.scheme.pickColor')}
            onChange={(hex) => onChange({ ...scheme, accent: hex })}
          />
        </div>
      </SettingsRow>

      <SettingsRow label={t('appearance.scheme.background')}>
        <ColorField
          value={resolved.background}
          testId={colorTestId('background')}
          ariaLabel={t('appearance.scheme.pickColor')}
          onChange={(hex) => onChange({ ...scheme, background: hex })}
        />
      </SettingsRow>

      <SettingsRow
        label={t('appearance.scheme.foreground')}
        warning={
          ratio < AA
            ? t('appearance.scheme.lowContrast', { ratio: ratio.toFixed(1) })
            : undefined
        }
      >
        <ColorField
          value={resolved.foreground}
          testId={colorTestId('foreground')}
          ariaLabel={t('appearance.scheme.pickColor')}
          onChange={(hex) => onChange({ ...scheme, foreground: hex })}
        />
      </SettingsRow>

      <ThemeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importTheme}
      />
    </Card>
  )
}
