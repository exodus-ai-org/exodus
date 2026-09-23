import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  LOCALE_IDS,
  LOCALES,
  type LanguageSetting
} from '@exodus/shared/i18n/locales'
import {
  COLOR_TONES,
  type ColorTone,
  type UseFormReturnType
} from '@exodus/shared/schemas/settings-schema'
import type { ParseKeys } from 'i18next'
import { Globe, Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Flag } from '@/components/flag'
import { Theme } from '@/components/theme-provider'
import { Switch } from '@/components/ui/switch'
import { setLoginItem, setMenuBar } from '@/lib/ipc'
import { applyTone } from '@/lib/tone'
import { cn } from '@/lib/utils'

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
  /** null for `auto`: a globe, never one country's flag. */
  flagCode: string | null
}[] = [
  { value: 'auto', nativeName: null, flagCode: null },
  ...LOCALE_IDS.map((id) => ({
    value: id,
    nativeName: LOCALES[id].nativeName,
    flagCode: LOCALES[id].flagCode
  }))
]

const APPEARANCE_MODES: {
  value: Theme
  labelKey: ParseKeys<'settings'>
  icon: typeof Sun
}[] = [
  { value: 'system', labelKey: 'general.theme.system', icon: SunMoon },
  { value: 'light', labelKey: 'general.theme.light', icon: Sun },
  { value: 'dark', labelKey: 'general.theme.dark', icon: Moon }
]

function AppearanceSwitcher() {
  const { t } = useTranslation('settings')
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-muted inline-flex w-fit gap-0.5 rounded-full p-0.5">
      {APPEARANCE_MODES.map(({ value, labelKey, icon: Icon }) => (
        <span key={value}>
          <input
            className="peer sr-only"
            type="radio"
            id={`appearance-mode-${value}`}
            name="appearance-mode"
            value={value}
            checked={theme === value}
            onChange={(event) => setTheme(event.target.value)}
          />
          <label
            htmlFor={`appearance-mode-${value}`}
            data-testid={`${TEST_IDS.settings.themeMode}-${value}`}
            aria-label={t(labelKey)}
            className="text-muted-foreground peer-checked:bg-background peer-checked:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors peer-checked:shadow-sm"
          >
            <Icon className="size-4" />
          </label>
        </span>
      ))}
    </div>
  )
}

// The dot for each tone is its `--primary` (see the `[data-tone]` blocks in
// globals.css); neutral is the default look.
const TONE_SWATCHES: Record<ColorTone, string> = {
  neutral: 'oklch(0.52 0 0)',
  emerald: 'oklch(0.52 0.17 160)',
  blue: 'oklch(0.52 0.17 230)',
  violet: 'oklch(0.52 0.17 285)',
  rose: 'oklch(0.52 0.17 350)',
  orange: 'oklch(0.52 0.17 55)',
  yellow: 'oklch(0.52 0.17 85)'
}

function ColorTonePicker({
  value,
  onChange
}: {
  value: ColorTone
  onChange: (tone: ColorTone) => void
}) {
  const { t } = useTranslation('settings')
  return (
    <div className="flex items-center gap-2">
      {COLOR_TONES.map((tone) => {
        const label = t(`general.colorTone.tones.${tone}`)
        return (
          <button
            key={tone}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={value === tone}
            data-testid={`${TEST_IDS.settings.colorTone}-${tone}`}
            className={cn(
              'size-6 rounded-full transition-[scale,box-shadow]',
              value === tone
                ? 'ring-ring ring-offset-background ring-2 ring-offset-2'
                : 'hover:scale-110'
            )}
            style={{ backgroundColor: TONE_SWATCHES[tone] }}
            onClick={() => onChange(tone)}
          />
        )
      })}
    </div>
  )
}

export function General({ form }: { form: UseFormReturnType }) {
  const { t } = useTranslation('settings')
  const runOnStartup = form.watch('runOnStartup') ?? false
  const menuBarEnabled = form.watch('menuBar') ?? true
  const language: LanguageSetting = form.watch('language') ?? 'auto'
  const tone: ColorTone = form.watch('colorTone') ?? 'neutral'

  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.nativeName ?? t('general.language.auto'),
        icon: o.flagCode ? (
          <Flag code={o.flagCode} />
        ) : (
          <Globe aria-hidden className="text-muted-foreground size-4" />
        )
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
          label={t('general.theme.label')}
          description={t('general.theme.description')}
        >
          <AppearanceSwitcher />
        </SettingsRow>

        <SettingsRow
          label={t('general.colorTone.label')}
          description={t('general.colorTone.description')}
        >
          <ColorTonePicker
            value={tone}
            onChange={(next) => {
              // Paint now; the autosave persists it and ToneBridge re-applies.
              applyTone(next)
              form.setValue('colorTone', next)
            }}
          />
        </SettingsRow>

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
