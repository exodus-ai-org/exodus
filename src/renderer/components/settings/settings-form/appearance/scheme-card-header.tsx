import {
  type SchemeColors,
  type SchemeSlot
} from '@exodus/shared/constants/appearance'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { ClipboardCopyIcon, DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { PresetSelect } from './preset-select'
import { SchemeSwatch } from './scheme-swatch'

/** Card title row: Import / Copy theme, the live "Aa" tile, the preset picker. */
export function SchemeCardHeader({
  slot,
  resolved,
  presetValue,
  onPreset,
  onImport,
  onCopy
}: {
  slot: SchemeSlot
  resolved: SchemeColors
  presetValue: string
  onPreset: (presetId: string) => void
  onImport: () => void
  onCopy: () => void
}) {
  const { t } = useTranslation('settings')
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium">{t(`appearance.scheme.${slot}`)}</h2>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          data-testid={`${TEST_IDS.appearance.importTheme}-${slot}`}
          onClick={onImport}
        >
          <DownloadIcon data-icon="inline-start" />
          {t('appearance.scheme.import')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          data-testid={`${TEST_IDS.appearance.copyTheme}-${slot}`}
          onClick={onCopy}
        >
          <ClipboardCopyIcon data-icon="inline-start" />
          {t('appearance.scheme.copy')}
        </Button>
        <SchemeSwatch colors={resolved} />
        <PresetSelect slot={slot} value={presetValue} onChange={onPreset} />
      </div>
    </div>
  )
}
