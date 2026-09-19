import {
  CUSTOM_PRESET_ID,
  THEME_PRESETS,
  type SchemeSlot
} from '@exodus/shared/constants/appearance'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { SchemeSwatch } from './scheme-swatch'

export function PresetSelect({
  slot,
  value,
  onChange
}: {
  slot: SchemeSlot
  /** A preset id, or CUSTOM_PRESET_ID when the scheme is customised. */
  value: string
  onChange: (presetId: string) => void
}) {
  const { t } = useTranslation('settings')
  const label = (id: string) =>
    id === CUSTOM_PRESET_ID
      ? t('appearance.scheme.custom')
      : (THEME_PRESETS.find((p) => p.id === id)?.name ?? id)

  return (
    <Select
      value={value}
      onValueChange={(v) => v && v !== CUSTOM_PRESET_ID && onChange(v)}
    >
      <SelectTrigger
        data-testid={`${TEST_IDS.appearance.presetSelect}-${slot}`}
        aria-label={t('appearance.scheme.presetLabel')}
        className="min-w-36"
      >
        <SelectValue>{(v: string) => label(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {value === CUSTOM_PRESET_ID && (
            <SelectItem value={CUSTOM_PRESET_ID} disabled>
              {t('appearance.scheme.custom')}
            </SelectItem>
          )}
          {THEME_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <SchemeSwatch colors={p[slot]} size="sm" />
              {p.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
